import { PropsWithChildren, useId, useState } from "react";
import { Platform, View, ViewStyle } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/** Fade content alpha only. The independently moving grain stays underneath. */
export function PageMask({ children }: PropsWithChildren) {
  const id = `mask${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [height, setHeight] = useState(800);
  if (Platform.OS === "web") {
    const gradient =
      "linear-gradient(to bottom, transparent 0px, black 26px, black calc(100% - 140px), transparent 100%)";
    return (
      <View
        testID="page-opacity-mask"
        style={
          {
            flex: 1,
            maskImage: gradient,
            WebkitMaskImage: gradient,
          } as ViewStyle
        }
      >
        {children}
      </View>
    );
  }
  return (
    <MaskedView
      testID="page-opacity-mask"
      style={{ flex: 1 }}
      androidRenderingMode="software"
      onLayout={(event) =>
        setHeight(Math.max(1, event.nativeEvent.layout.height))
      }
      maskElement={
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="black" stopOpacity="0" />
              <Stop
                offset={Math.min(0.4, 26 / height)}
                stopColor="black"
                stopOpacity="1"
              />
              <Stop
                offset={Math.max(0.4, 1 - 140 / height)}
                stopColor="black"
                stopOpacity="1"
              />
              <Stop offset="1" stopColor="black" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      }
    >
      {children}
    </MaskedView>
  );
}
