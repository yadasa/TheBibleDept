import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useReducedMotion } from './LiquidBottomNav';
import { useScreenScrollControls } from './ScreenScrollView';
import { verseVisibilityOpacity } from '../services/verseMotion';

const Origin=createContext<{top:SharedValue<number>;reduced:boolean}|null>(null);
const Row=createContext<SharedValue<number>|null>(null);

/** Measure the passage origin on layout/activation, never once per verse per frame. */
export function VerseFadeGroup({children}:PropsWithChildren) {
  const controls=useScreenScrollControls(),ref=useRef<View>(null),origin=useSharedValue(Number.NaN),frame=useRef<number|null>(null);
  const reduced=useReducedMotion(),group=useMemo(()=>({top:origin,reduced}),[origin,reduced]);
  const measure=useCallback(()=>{
    if(frame.current!==null)cancelAnimationFrame(frame.current);
    frame.current=requestAnimationFrame(()=>{frame.current=null;controls.measureContent(ref.current,bounds=>{origin.value=bounds.top;});});
  },[controls,origin]);
  useEffect(()=>{
    let previous=controls.getMetrics();measure();
    const stop=controls.subscribe(next=>{
      if(next.active&&(!previous.active||next.contentHeight!==previous.contentHeight||next.viewportHeight!==previous.viewportHeight))measure();
      previous=next;
    });
    return()=>{stop();if(frame.current!==null)cancelAnimationFrame(frame.current);};
  },[controls,measure]);
  return <Origin.Provider value={group}><View ref={ref} collapsable={false} onLayout={measure}>{children}</View></Origin.Provider>;
}

/** The row stays fully opaque: it can contain live glass note/selection controls. */
export function VerseFadeRow({children}:PropsWithChildren) {
  const top=useSharedValue(0);
  return <Row.Provider value={top}><View onLayout={event=>{top.value=event.nativeEvent.layout.y;}}>{children}</View></Row.Provider>;
}

export function VerseFadeText({children,disabled=false}:PropsWithChildren<{disabled?:boolean}>) {
  const group=useContext(Origin),row=useContext(Row),{motion}=useScreenScrollControls();
  const top=useSharedValue(0),height=useSharedValue(0);
  const style=useAnimatedStyle(()=>{
    if(disabled||!group||group.reduced||!motion||!row)return {opacity:1};
    const opacity=verseVisibilityOpacity(group.top.value+row.value+top.value-motion.offsetY.value,height.value,motion.viewportHeight.value);
    // Visibility already uses a continuous smoothstep curve. Following native
    // scroll frames avoids restarting a timing animation for every verse/tick.
    return {opacity};
  },[disabled,group,motion,row]);
  return <Animated.View testID="verse-scroll-fade" onLayout={event=>{top.value=event.nativeEvent.layout.y;height.value=event.nativeEvent.layout.height;}} style={style}>{children}</Animated.View>;
}
