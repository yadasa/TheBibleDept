import { RefObject, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme";
import { Icon, IconName } from "./Icon";
import { GlassBackdrop } from "./Glass";
import { journeyDuration, tabOrder, Tab } from "../services/tabPaging";
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
  onTransitionStart: (tab: Tab, immediate: boolean) => void | Promise<void>;
  onSettled: (tab: Tab) => void;
  progress: Animated.Value;
  blurTarget: RefObject<View | null>;
}) {
  const { colors: c } = useTheme(),
    reduced = useReducedMotion(),
    [width, setWidth] = useState(0);
  const cell = (width - 14 - 16) / 5,
    target = 7 + tabOrder.indexOf(active) * (cell + 4);
  const [frames, setFrames] = useState({
    left: [target, target, target, target],
    width: [
      Math.max(0, cell),
      Math.max(0, cell),
      Math.max(0, cell),
      Math.max(0, cell),
    ],
  });
  const visual = useRef({ left: target, width: cell }),
    sequence = useRef(0),
    settled = useRef(onSettled),
    start = useRef(onTransitionStart),
    lastWidth = useRef(0);
  settled.current = onSettled;
  start.current = onTransitionStart;
  const initialized = useRef(false);
  useEffect(() => {
    if (width <= 0) return;
    const seq = ++sequence.current;
    progress.stopAnimation();
    const from = visual.current,
      delta = target - from.left,
      right = delta >= 0,
      stretch = Math.min(Math.abs(delta) * 0.42 + 14, 76),
      trailing = Math.min(stretch * 0.48, 34);
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
      setFrames({
        left: [target, target, target, target],
        width: [cell, cell, cell, cell],
      });
      start.current(active, true);
      progress.setValue(1);
      settled.current(active);
      return;
    }
    const next = {
      left: right
        ? [from.left, from.left, target - trailing, target]
        : [from.left, from.left - stretch, target, target],
      width: [from.width, from.width + stretch, cell + trailing, cell],
    };
    setFrames(next);
    let listener: string | undefined;
    // Native capture is bounded by MotionBlur; a superseded request must not
    // restart an old journey after the user chooses another destination.
    async function animate() {
      const prepared = start.current(active, false);
      // Hold both tracks at their real starting point while native capture
      // completes; retaining progress=1 here would flash the new destination.
      progress.setValue(0);
      await prepared;
      if (seq !== sequence.current) return;
      listener = progress.addListener(({ value }) => {
        const stops = [0, 0.24, 0.72, 1],
          i = value < 0.24 ? 0 : value < 0.72 ? 1 : 2,
          fraction = (value - stops[i]) / (stops[i + 1] - stops[i]);
        visual.current = {
          left: next.left[i] + (next.left[i + 1] - next.left[i]) * fraction,
          width: next.width[i] + (next.width[i + 1] - next.width[i]) * fraction,
        };
      });
      Animated.timing(progress, {
        toValue: 1,
        duration: journeyDuration(0, Math.abs(delta) / (cell + 4)),
        easing: Easing.bezier(0.22, 0.82, 0.18, 1),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && seq === sequence.current) {
          visual.current = { left: target, width: cell };
          settled.current(active);
        }
      });
    }
    void animate();
    return () => {
      sequence.current += 1;
      if (listener) progress.removeListener(listener);
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
        testID="transparent-navigation"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          width: "100%",
          maxWidth: 420,
          minHeight: 76,
          borderRadius: 29,
          overflow: "hidden",
          backgroundColor: "transparent",
        }}
      >
        {width > 0 && (
          <Animated.View
            testID="navigation-indicator"
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 7,
              bottom: 7,
              borderRadius: 21,
              overflow: "hidden",
              boxShadow: "0 2px 9px rgba(0,0,0,.16)",
              left: progress.interpolate({
                inputRange: [0, 0.24, 0.72, 1],
                outputRange: frames.left,
              }),
              width: progress.interpolate({
                inputRange: [0, 0.24, 0.72, 1],
                outputRange: frames.width,
              }),
            }}
          >
            <GlassBackdrop tone="primary" target={blurTarget} />
          </Animated.View>
        )}
        <View
          accessibilityRole="tablist"
          style={{ flexDirection: "row", gap: 4, padding: 7 }}
        >
          {tabOrder.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityLabel={item}
              aria-selected={active === item}
              accessibilityState={{ selected: active === item }}
              onPress={() => onNavigate(item)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 60,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                borderRadius: 21,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Icon
                name={icons[item]}
                size={24}
                color={active === item ? c.onAction : c.ink}
              />
              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 15,
                  fontWeight: "800",
                  color: active === item ? c.onAction : c.ink,
                }}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
