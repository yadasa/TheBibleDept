import { PropsWithChildren } from "react";
import { Platform, View, ViewStyle } from "react-native";

/** Native visual-effect views must not sit beneath an ancestor mask. */
export function PageMask({ children }: PropsWithChildren) {
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
    <View
      testID="native-page-content"
      style={{ flex: 1 }}
    >
      {children}
    </View>
  );
}
