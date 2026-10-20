import { ComponentProps, createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, View } from 'react-native';
import Animated, { runOnJS, SharedValue, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { usePlan } from '../services/PlanProvider';
import { createReadingScrollIntent, isVerticalReadingGesture } from '../services/lessonProgress';

export type ScreenScrollMetrics = Readonly<{ offsetY: number; viewportHeight: number; contentHeight: number; active: boolean; restoring: boolean; userInitiated: boolean }>;
type Controls = {
  motion: {offsetY:SharedValue<number>;viewportHeight:SharedValue<number>} | null;
  top: () => void;
  scrollTo: (options: { y: number; animated?: boolean }) => void;
  getMetrics: () => ScreenScrollMetrics;
  subscribe: (listener: (metrics: ScreenScrollMetrics) => void) => () => void;
  measureContent: (target: View | null, listener: (bounds: { top: number; bottom: number }) => void) => void;
  registerAnchor: (name: string, target: View | null) => () => void;
  scrollToAnchor: (name: string) => void;
};
const empty: Controls = { motion:null, top: () => {}, scrollTo: () => {}, getMetrics: () => ({ offsetY: 0, viewportHeight: 0, contentHeight: 0, active: false, restoring: true, userInitiated: false }), subscribe: () => () => {}, measureContent: () => {}, registerAnchor: () => () => {}, scrollToAnchor: () => {} };
const Context = createContext<Controls>(empty);
export const useScreenScroll = () => useContext(Context).top;
export const useScreenScrollControls = () => useContext(Context);

export function ScreenScrollView({ active = true, resetOnPlanDayChange = false, trackMotion=true, ...props }: ComponentProps<typeof ScrollView> & { active?: boolean; resetOnPlanDayChange?: boolean; trackMotion?:boolean }) {
  const motionY=useSharedValue(0),motionHeight=useSharedValue(0);
  const motion=useMemo(()=>({offsetY:motionY,viewportHeight:motionHeight}),[motionY,motionHeight]);
  const ref = useRef<ScrollView>(null), viewport = useRef<View>(null), { selectedDay } = usePlan();
  const offset = useRef({ x: 0, y: 0 }), activeRef = useRef(active), restorePending = useRef(true);
  const viewportHeight = useRef(0), contentHeight = useRef(0);
  const listeners = useRef(new Set<(metrics: ScreenScrollMetrics) => void>());
  const anchors = useRef(new Map<string, View>()), pendingAnchor = useRef<string | null>(null);
  const anchorFrame = useRef<number | null>(null), anchorGeneration = useRef(0);
  const [scrollIntent] = useState(createReadingScrollIntent);
  const touchOrigin = useRef<{x:number;y:number}|null>(null);
  if (activeRef.current !== active) {
    activeRef.current = active;scrollIntent.clear();
    if (active) restorePending.current = true;
    else {pendingAnchor.current=null;anchorGeneration.current++;}
  }
  const getMetrics = useCallback((): ScreenScrollMetrics => ({ offsetY: offset.current.y, viewportHeight: viewportHeight.current, contentHeight: contentHeight.current, active: activeRef.current, restoring: restorePending.current, userInitiated: scrollIntent.isUserInitiated() }), [scrollIntent]);
  // Scroll frames update motion directly on the UI thread. Delayed JS bookkeeping
  // must never write an older offset back over the latest native frame.
  const notify = useCallback((syncMotion=true) => { const value = getMetrics();if(syncMotion){motionY.value=value.offsetY;motionHeight.value=value.viewportHeight;}listeners.current.forEach(listener => listener(value)); }, [getMetrics,motionY,motionHeight]);
  const receiveScroll=useCallback((event:NativeScrollEvent)=>{
    if(activeRef.current&&!restorePending.current){offset.current={x:0,y:event.contentOffset.y};if(listeners.current.size)notify(false);}
    props.onScroll?.({nativeEvent:event} as NativeSyntheticEvent<NativeScrollEvent>);
  },[notify,props.onScroll]);
  const lastNotice=useSharedValue(0);
  const scrollHandler=useAnimatedScrollHandler(event=>{
    motionY.value=event.contentOffset.y;
    const now=Date.now();
    if(now-lastNotice.value>=48){lastNotice.value=now;runOnJS(receiveScroll)(event);}
  });
  const positionScroll = useCallback(({ y, animated = false }: { y: number; animated?: boolean }, preserveAnchor = false) => {
    if (!Number.isFinite(y)) return;
    if(!preserveAnchor){pendingAnchor.current = null;anchorGeneration.current++;}
    scrollIntent.clear();
    offset.current = { x: 0, y: Math.max(0, y) };
    if (activeRef.current) { ref.current?.scrollTo({ x: 0, y: offset.current.y, animated }); restorePending.current = false; }
    else restorePending.current = true;
    notify();
  }, [notify,scrollIntent]);
  const scrollTo=useCallback((options:{y:number;animated?:boolean})=>positionScroll(options),[positionScroll]);
  const top = useCallback(() => scrollTo({ y: 0 }), [scrollTo]);
  const measureContent = useCallback((target: View | null, listener: (bounds: { top: number; bottom: number }) => void) => {
    if (!target || !activeRef.current || !viewport.current) return;
    viewport.current.measureInWindow((_scrollX, scrollY) => {
      target.measureInWindow((_x, y, _width, height) => {
        if (activeRef.current && height > 0 && Number.isFinite(y) && Number.isFinite(scrollY)) {
          const top = y - scrollY + offset.current.y;
          listener({ top, bottom: top + height });
        }
      });
    });
  }, []);
  const resolveAnchor = useCallback(() => {
    const name = pendingAnchor.current, target = name ? anchors.current.get(name) : undefined;
    if (!name || !target || !activeRef.current) return;
    const generation = anchorGeneration.current;
    measureContent(target, bounds => {
      if (pendingAnchor.current !== name || generation !== anchorGeneration.current) return;
      // Keep the requested destination through later text/card layout changes.
      // A real user scroll, explicit top/day change, or leaving the page cancels it.
      positionScroll({ y: Math.max(0, bounds.top - 12), animated: false },true);
    });
  }, [measureContent, positionScroll]);
  const scheduleAnchor = useCallback(() => {
    if(!pendingAnchor.current)return;
    if (anchorFrame.current !== null) cancelAnimationFrame(anchorFrame.current);
    anchorFrame.current = requestAnimationFrame(() => { anchorFrame.current = null; resolveAnchor(); });
  }, [resolveAnchor]);
  const controls = useMemo<Controls>(() => ({ motion:trackMotion?motion:null, top, scrollTo, getMetrics,
    subscribe: listener => { listeners.current.add(listener); return () => { listeners.current.delete(listener); }; },
    measureContent,
    registerAnchor: (name, target) => {
      if (target) { anchors.current.set(name, target); if (pendingAnchor.current === name) scheduleAnchor(); }
      else anchors.current.delete(name);
      return () => { if (anchors.current.get(name) === target) anchors.current.delete(name); };
    },
    scrollToAnchor: name => { pendingAnchor.current = name; anchorGeneration.current++; scheduleAnchor(); },
  }), [trackMotion,motion, top, scrollTo, getMetrics, measureContent, scheduleAnchor]);
  const restore = useCallback(() => {
    if (!activeRef.current || !restorePending.current) return;
    ref.current?.scrollTo({ x: 0, y: offset.current.y, animated: false });
    restorePending.current = false;
    scrollIntent.clear();
    notify();
    scheduleAnchor();
  }, [notify, scheduleAnchor,scrollIntent]);
  useEffect(() => {
    if (!active) { notify(); return; }
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [active, restore, notify]);
  // Reset before descendant passive effects request a restored reading place
  // or the podcast anchor. A later parent effect would erase that request.
  useLayoutEffect(() => { if (resetOnPlanDayChange) top(); }, [selectedDay, resetOnPlanDayChange, top]);
  useEffect(() => () => { if (anchorFrame.current !== null) cancelAnimationFrame(anchorFrame.current); }, []);
  const beginUserScroll=(source:'drag'|'touch'|'wheel'|'key'|'momentum')=>{
    scrollIntent.begin(source);
    if(scrollIntent.isUserInitiated()){pendingAnchor.current=null;anchorGeneration.current++;}
  };
  const webGestures=Platform.OS==='web'?{
    onWheel:()=>beginUserScroll('wheel'),
    onKeyDown:(event:{key:string})=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))beginUserScroll('key');},
  }:{};
  const ScrollComponent=trackMotion?Animated.ScrollView:ScrollView;
  return <Context.Provider value={controls}><View ref={viewport} collapsable={false} style={{flex:1,minWidth:0,minHeight:0,width:'100%'}}><ScrollComponent {...props} {...webGestures} ref={ref}
    horizontal={false} directionalLockEnabled alwaysBounceHorizontal={false}
    showsVerticalScrollIndicator={Platform.OS==='web'?false:props.showsVerticalScrollIndicator}
    style={[props.style,{minWidth:0,width:'100%'}]}
    contentContainerStyle={[props.contentContainerStyle,{minWidth:0,width:'100%'}]}
    scrollEventThrottle={trackMotion?16:96}
    onScroll={trackMotion?scrollHandler:event=>receiveScroll(event.nativeEvent)}
    onScrollBeginDrag={event => { beginUserScroll('drag');props.onScrollBeginDrag?.(event); }}
    onScrollEndDrag={event=>{receiveScroll(event.nativeEvent);scrollIntent.end('drag');props.onScrollEndDrag?.(event);}}
    onMomentumScrollBegin={event=>{beginUserScroll('momentum');props.onMomentumScrollBegin?.(event);}}
    onMomentumScrollEnd={event=>{receiveScroll(event.nativeEvent);scrollIntent.end('momentum');props.onMomentumScrollEnd?.(event);}}
    onPointerDown={event=>{scrollIntent.clear();props.onPointerDown?.(event);}}
    onTouchStart={event=>{scrollIntent.clear();touchOrigin.current={x:event.nativeEvent.pageX,y:event.nativeEvent.pageY};props.onTouchStart?.(event);}}
    onTouchMove={Platform.OS==='web'?event=>{if(isVerticalReadingGesture(touchOrigin.current,{x:event.nativeEvent.pageX,y:event.nativeEvent.pageY}))beginUserScroll('touch');props.onTouchMove?.(event);}:props.onTouchMove}
    onTouchEnd={event=>{touchOrigin.current=null;scrollIntent.end('touch');props.onTouchEnd?.(event);}}
    onTouchCancel={event=>{touchOrigin.current=null;scrollIntent.end('touch');scrollIntent.end('drag');props.onTouchCancel?.(event);}}
    onContentSizeChange={(width, height) => { contentHeight.current = height; props.onContentSizeChange?.(width, height); notify(); scheduleAnchor(); }}
    onLayout={event => { viewportHeight.current = event.nativeEvent.layout.height; props.onLayout?.(event); if (activeRef.current && restorePending.current) requestAnimationFrame(restore); else { notify(); scheduleAnchor(); } }}
  /></View></Context.Provider>;
}
