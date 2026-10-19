import { memo, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme";
import { GrainBackground } from "./GrainBackground";
import { tabOrder } from "../services/tabPaging";

/** Broad reflected light gives frosted material something visible to transmit. */
export const PageBackdrop = memo(function PageBackdrop() {
  const { mode, colors: c } = useTheme(),
    dark = mode === "dark";
  const id = `paper${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${400 * tabOrder.length} 1000`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        aria-hidden
      >
        <Defs>
          <RadialGradient id={`${id}warm`} cx="95%" cy="36%" rx="105%" ry="65%">
            <Stop
              offset="0"
              stopColor="#DF8A4C"
              stopOpacity={dark ? 0.19 : 0.14}
            />
            <Stop offset="1" stopColor="#DF8A4C" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`${id}cool`} cx="0%" cy="80%" rx="90%" ry="50%">
            <Stop
              offset="0"
              stopColor={dark ? "#C2D4DF" : "white"}
              stopOpacity={dark ? 0.08 : 0.35}
            />
            <Stop offset="1" stopColor="white" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {tabOrder.map((tab, index) => (
          <Svg key={tab} x={index * 400} width={400} height={1000}>
            <Rect width="100%" height="100%" fill={`url(#${id}warm)`} />
            <Rect width="100%" height="100%" fill={`url(#${id}cool)`} />
          </Svg>
        ))}
      </Svg>
      <GrainBackground />
    </View>
  );
});
