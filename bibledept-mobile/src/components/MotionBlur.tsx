import { PropsWithChildren, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { useTheme } from "../theme";

/** Uses the nav's clock, so blur always clears with the page, including interruption. */
export function MotionBlur({
  children,
  progress,
}: PropsWithChildren<{ progress: Animated.Value }>) {
  const target = useRef<View | null>(null),
    { mode } = useTheme();
  if (Platform.OS === "web")
    return (
      <Animated.View
        testID="page-motion-blur"
        style={{
          flex: 1,
          filter: progress.interpolate({
            inputRange: [0, 0.12, 0.35, 0.75, 1],
            outputRange: [
              "blur(0px)",
              "blur(5px)",
              "blur(5px)",
              "blur(2px)",
              "blur(0px)",
            ],
          }),
        }}
      >
        {children}
      </Animated.View>
    );
  return (
    <View testID="page-motion-blur" style={{ flex: 1 }}>
      <BlurTargetView ref={target} style={{ flex: 1 }}>
        {children}
      </BlurTargetView>
      <Animated.View
        pointerEvents="none"
        accessible={false}
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: progress.interpolate({
              inputRange: [0, 0.12, 0.35, 0.75, 1],
              outputRange: [0, 0.9, 0.9, 0.35, 0],
            }),
          },
        ]}
      >
        <BlurView
          blurTarget={target}
          blurMethod="dimezisBlurViewSdk31Plus"
          blurReductionFactor={2}
          tint={
            mode === "dark"
              ? "systemUltraThinMaterialDark"
              : "systemUltraThinMaterialLight"
          }
          intensity={32}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
