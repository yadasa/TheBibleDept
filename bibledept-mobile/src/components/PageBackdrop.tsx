import { memo, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, G, RadialGradient, Rect, Stop } from "react-native-svg";
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
          {/* Native SVG keeps paint servers in their owning root. Each page
              uses explicit coordinates in this one shared viewport, rather
              than looking up an outer gradient from a nested Svg root. */}
          {tabOrder.flatMap((tab, index) => [
            <RadialGradient key={`${tab}warm`} id={`${id}warm${index}`}
              gradientUnits="userSpaceOnUse" cx={index * 400 + 380} cy={360} rx={420} ry={650}>
              <Stop offset={0} stopColor="#F05A00" stopOpacity={dark ? .24 : .15}/>
              <Stop offset={1} stopColor="#F05A00" stopOpacity={0}/>
            </RadialGradient>,
            <RadialGradient key={`${tab}cool`} id={`${id}cool${index}`}
              gradientUnits="userSpaceOnUse" cx={index * 400} cy={800} rx={360} ry={500}>
              <Stop offset={0} stopColor={dark ? "#C2D4DF" : "white"} stopOpacity={dark ? .08 : .35}/>
              <Stop offset={1} stopColor={dark ? "#C2D4DF" : "white"} stopOpacity={0}/>
            </RadialGradient>,
          ])}
        </Defs>
        {tabOrder.map((tab, index) => (
          <G key={tab}>
            <Rect x={index * 400} y={0} width={400} height={1000} fill={`url(#${id}warm${index})`} />
            <Rect x={index * 400} y={0} width={400} height={1000} fill={`url(#${id}cool${index})`} />
          </G>
        ))}
      </Svg>
      <GrainBackground />
    </View>
  );
});
