import { RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../theme";
import { Icon, IconName } from "./Icon";
import { GlassBackdrop } from "./Glass";
import { journeyDuration, tabOrder, Tab } from "../services/tabPaging";
import { indicatorJourney, indicatorPosition, navigationMetrics, NAV_GAP, NAV_PADDING } from "../services/tabIndicator";
export { tabOrder, Tab } from "../services/tabPaging";
const icons: Record<Tab, IconName> = {
  Notes: "notes",
  Prayer: "heart",
  Home: "home",
  Bible: "book",
  Account: "user",
};
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
/** Church stretch keyframes share one clock with the continuous page track. */
export function LiquidBottomNav({
  active,
  onNavigate,
  onTransitionStart,
  onSettled,
  progress,
  blurTarget,
}: {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  onTransitionStart: (tab: Tab, immediate: boolean) => void;
  onSettled: (tab: Tab) => void;
  progress: Animated.Value;
  blurTarget: RefObject<View | null>;
}) {
  const { mode, colors: c } = useTheme(),
    reduced = useReducedMotion(),
    [width, setWidth] = useState(0),
    [pressedTab, setPressedTab] = useState<Tab | null>(null);
  const { cellWidth: cell, rowWidth } = navigationMetrics(width),
    target = NAV_PADDING + tabOrder.indexOf(active) * (cell + NAV_GAP);
  const indicatorLeft = useRef(new Animated.Value(target)).current;
  const indicatorWidth = useRef(new Animated.Value(cell)).current;
  const invertedRowLeft = useMemo(() => Animated.subtract(NAV_PADDING, indicatorLeft), [indicatorLeft]);
  const visual = useRef({ left: target, width: cell }),
    sequence = useRef(0),
    settled = useRef(onSettled),
    start = useRef(onTransitionStart),
    lastWidth = useRef(0);
  settled.current = onSettled;
  start.current = onTransitionStart;
  const initialized = useRef(false);
  useLayoutEffect(() => {
    if (width <= 0) return;
    const seq = ++sequence.current;
    progress.stopAnimation();
    const from = visual.current,
      delta = target - from.left,
      distance = Math.abs(delta) / (cell + NAV_GAP);
    const resized = lastWidth.current !== 0 && lastWidth.current !== width;
    lastWidth.current = width;
    if (
      reduced ||
      !initialized.current ||
      resized ||
      (Math.abs(delta) < 0.01 && Math.abs(from.width - cell) < 0.01)
    ) {
      initialized.current = true;
      visual.current = { left: target, width: cell };
      indicatorLeft.setValue(target);
      indicatorWidth.setValue(cell);
      start.current(active, true);
      progress.setValue(1);
      settled.current(active);
      return;
    }
    const journey = indicatorJourney(from, target, cell);
    start.current(active, false);
    const listener = progress.addListener(({ value }) => {
      const current = indicatorPosition(journey, value);
      visual.current = current;
      indicatorLeft.setValue(current.left);
      indicatorWidth.setValue(current.width);
    });
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: journeyDuration(0, distance),
      easing: Easing.bezier(0.22, 0.82, 0.18, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && seq === sequence.current) {
        visual.current = { left: target, width: cell };
        indicatorLeft.setValue(target);
        indicatorWidth.setValue(cell);
        settled.current(active);
      }
    });
    return () => {
      sequence.current += 1;
      progress.removeListener(listener);
      progress.stopAnimation();
    };
  }, [active, width, reduced]);
  return (
    <View
      testID="floating-navigation"
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 10,
        zIndex: 100,
        paddingHorizontal: 12,
        alignItems: "center",
      }}
    >
      <View
        testID="frosted-navigation"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          width: "100%",
          maxWidth: 420,
          minHeight: 70,
          borderRadius: 29,
          overflow: "hidden",
          backgroundColor: "transparent",
          isolation: "isolate",
          boxShadow: "0 14px 40px rgba(0,0,0,.18)",
        }}
      >
        <GlassBackdrop material="navigation" target={blurTarget} />
        {width > 0 && (
          <Animated.View
            testID="navigation-indicator"
            pointerEvents="none"
            accessible={false}
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: "absolute",
              zIndex: 3,
              top: NAV_PADDING,
              bottom: NAV_PADDING,
              borderRadius: 21,
              overflow: "hidden",
              boxShadow: "0 2px 9px rgba(0,0,0,.16)",
              left: indicatorLeft,
              width: indicatorWidth,
            }}
          >
            {/* The shell already frosts the page; a second moving blur can
                retain stale icon/text pixels in browser compositing layers. */}
            <GlassBackdrop tone="primary" blur={false} />
            <Animated.View
              testID="navigation-inverted-row"
              pointerEvents="none"
              style={{ position: "absolute", zIndex: 1, top: 0, left: invertedRowLeft, width: rowWidth, flexDirection: "row", gap: NAV_GAP }}
            >
              {tabOrder.map(item => <View key={item}
                style={[styles.item, { width: cell }, pressedTab === item && styles.pressed]}>
                <TabGlyphs item={item} iconColor={mode === "dark" ? c.onOrange : "#FFFFFF"} labelColor={c.onOrange}/>
              </View>)}
            </Animated.View>
          </Animated.View>
        )}
        <View
          accessibilityRole="tablist"
          style={[{ position: "relative", zIndex: 2, isolation: "isolate", flexDirection: "row", gap: NAV_GAP, padding: NAV_PADDING },
            // Keep the foreground on its own stable layer as the pill changes
            // width beneath it. The transform never moves the tab row.
            Platform.OS === "web" && { transform: "translateZ(0)", willChange: "transform" } as ViewStyle]}
        >
          {tabOrder.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityLabel={item}
              aria-selected={active === item}
              accessibilityState={{ selected: active === item }}
              onPress={() => onNavigate(item)}
              onPressIn={() => setPressedTab(item)}
              onPressOut={() => setPressedTab(value => value === item ? null : value)}
              style={[styles.item, { flex: 1 }, pressedTab === item && styles.pressed]}
            >
              <TabGlyphs item={item} iconColor={c.ink} labelColor={c.ink}/>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Identical layout on both sides of the rounded indicator clip. */
function TabGlyphs({item, iconColor, labelColor}:{item:Tab;iconColor:string;labelColor:string}) {
  return <>
    <Icon name={icons[item]} size={24} color={iconColor}/>
    <Text style={[styles.label, {color:labelColor}]}>{item}</Text>
  </>;
}

const styles=StyleSheet.create({
  item:{minHeight:56,alignItems:"center",justifyContent:"center",gap:4,borderRadius:21},
  pressed:{transform:[{scale:.96}]},
  label:{fontSize:11,lineHeight:15,fontWeight:"800"},
});
