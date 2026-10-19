import { RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { indicatorJourney, indicatorPosition, tabUsesIndicatorInk } from "../services/tabIndicator";
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
  const { colors: c } = useTheme(),
    reduced = useReducedMotion(),
    [width, setWidth] = useState(0),
    [settledTab, setSettledTab] = useState<Tab | null>(null);
  const cell = Math.max(0, (width - 14 - 16) / 5),
    target = 7 + tabOrder.indexOf(active) * (cell + 4);
  const indicatorLeft = useRef(new Animated.Value(target)).current;
  const indicatorWidth = useRef(new Animated.Value(cell)).current;
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
      distance = Math.abs(delta) / (cell + 4);
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
      setSettledTab(active);
      start.current(active, true);
      progress.setValue(1);
      settled.current(active);
      return;
    }
    const journey = indicatorJourney(from, target, cell);
    setSettledTab(null);
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
        setSettledTab(active);
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
              left: indicatorLeft,
              width: indicatorWidth,
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
                color={tabUsesIndicatorInk(item, active, settledTab) ? c.onAction : c.ink}
              />
              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 15,
                  fontWeight: "800",
                  color: tabUsesIndicatorInk(item, active, settledTab) ? c.onAction : c.ink,
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
