import { RefObject, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../theme";
import { Icon, IconName } from "./Icon";
export const tabOrder = [
  "Notes",
  "Prayer",
  "Home",
  "Bible",
  "Account",
] as const;
export type Tab = (typeof tabOrder)[number];
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
/** Port of yadasa/church LiquidBottomNav: 0/.24/.72/1 keyframes, 430ms, same stretch formula. */
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
  const { colors: c, mode } = useTheme(),
    reduced = useReducedMotion(),
    [width, setWidth] = useState(0);
  const cell = (width - 2 - 14 - 16) / 5,
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
    if (reduced || !initialized.current || resized) {
      initialized.current = true;
      visual.current = { left: target, width: cell };
      setFrames({
        left: [target, target, target, target],
        width: [cell, cell, cell, cell],
      });
      progress.setValue(1);
      start.current(active, true);
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
    progress.setValue(0);
    start.current(active, false);
    const listener = progress.addListener(({ value }) => {
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
      duration: 430,
      easing: Easing.bezier(0.22, 0.82, 0.18, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && seq === sequence.current) {
        visual.current = { left: target, width: cell };
        settled.current(active);
      }
    });
    return () => {
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
          minHeight: 76,
          borderRadius: 29,
          overflow: "hidden",
          borderWidth: 1,
          borderColor:
            mode === "dark" ? "rgba(255,245,245,.35)" : "rgba(255,255,255,.85)",
          backgroundColor:
            mode === "dark" ? "rgba(40,36,31,.10)" : "rgba(255,245,245,.10)",
          boxShadow:
            "0 14px 40px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.3)",
        }}
      >
        <BlurView
          tint={mode === "dark" ? "dark" : "light"}
          intensity={90}
          blurTarget={blurTarget}
          blurMethod="dimezisBlurView"
          blurReductionFactor={2}
          style={{ position: "absolute", inset: 0 }}
        />
        {width > 0 && (
          <Animated.View
            testID="navigation-indicator"
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 7,
              bottom: 7,
              borderRadius: 21,
              backgroundColor:
                mode === "dark" ? "rgba(255,145,77,.90)" : "rgba(183,67,0,.94)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,.22)",
              boxShadow:
                "inset 0 1px 2px rgba(255,255,255,.32), 0 2px 9px rgba(0,0,0,.16)",
              left: progress.interpolate({
                inputRange: [0, 0.24, 0.72, 1],
                outputRange: frames.left,
              }),
              width: progress.interpolate({
                inputRange: [0, 0.24, 0.72, 1],
                outputRange: frames.width,
              }),
            }}
          />
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
