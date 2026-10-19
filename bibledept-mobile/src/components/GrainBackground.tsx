import { memo } from "react";
import { Image, Platform, StyleSheet, View, ViewStyle } from "react-native";
import { Asset } from "expo-asset";
import { useTheme } from "../theme";

const tiles = {
  dark: require('../../assets/grain/grain-dark.png'),
  light: require('../../assets/grain/grain-light.png'),
};

/** The original 1,000-fleck SVG, baked once at each display density. */
export const GrainBackground = memo(function GrainBackground() {
  const { mode, colors: c } = useTheme();
  const source = tiles[mode];
  if (Platform.OS === 'web') {
    return <View
      testID="grain-background"
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, {
        opacity: .16,
        backgroundImage: `url("${Asset.fromModule(source).uri}")`,
        backgroundRepeat: 'repeat',
        backgroundPosition: '0 0',
        // A @3x asset still occupies the original 120 logical pixel tile.
        backgroundSize: '120px 120px',
      } as ViewStyle]}
    />;
  }
  return (
    <View
      testID="grain-background"
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { opacity: 0.16 }]}
    >
      <Image source={source} resizeMode="repeat" tintColor={c.ink}
        fadeDuration={0} accessible={false} style={StyleSheet.absoluteFill}/>
    </View>
  );
});
