import { memo, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";
import { useTheme } from "../theme";
// Small deterministic vector tile; no animation, shader, or network texture.
let seed = 1729;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
const flecks = Array.from({ length: 1000 }, () => ({
  x: random() * 120,
  y: random() * 120,
  size: 0.7 + random() * 0.7,
  opacity: 0.3 + random() * 0.7,
}));
export const GrainBackground = memo(function GrainBackground() {
  const { colors: c } = useTheme(),
    id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { opacity: 0.16 }]}
    >
      <Svg width="100%" height="100%" aria-hidden>
        <Defs>
          <Pattern
            id={id}
            width={120}
            height={120}
            patternUnits="userSpaceOnUse"
          >
            {flecks.map((f, i) => (
              <Rect
                key={i}
                x={f.x}
                y={f.y}
                width={f.size}
                height={f.size}
                opacity={f.opacity}
                fill={c.ink}
              />
            ))}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});
