import {
  createContext,
  PropsWithChildren,
  RefObject,
  useContext,
  useId,
  useState,
} from "react";
import {
  Pressable,
  Platform,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useTheme } from "../theme";

type Target = RefObject<View | null>;
type Tone = "neutral" | "primary" | "selected" | "subtle";
const GlassContext = createContext<Target | undefined>(undefined);
export function GlassProvider({
  target,
  children,
}: PropsWithChildren<{ target: Target }>) {
  return (
    <GlassContext.Provider value={target}>{children}</GlassContext.Provider>
  );
}

/** A separate grain target avoids sampling buttons recursively on Android. */
export function GlassBackdrop({
  tone = "neutral",
  color,
  target,
  material = "control",
  blur = true,
}: {
  tone?: Tone;
  color?: string;
  target?: Target;
  material?: "control" | "navigation";
  /** Layer color over an already frosted surface without sampling it again. */
  blur?: boolean;
}) {
  const { mode } = useTheme(),
    backdrop = useContext(GlassContext);
  const id = `glass${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const dark = mode === "dark";
  const navigation = material === "navigation";
  const primary = tone === "primary" && !color;
  const tint =
    color ||
    (primary
      ? "transparent"
      : navigation
        ? dark ? "rgba(38,33,29,.48)" : "rgba(255,245,245,.48)"
      : tone === "selected"
        ? dark
          ? "rgba(255,145,77,.22)"
          : "rgba(183,67,0,.14)"
        : dark
          ? `rgba(255,245,235,${tone === "subtle" ? ".025" : ".045"})`
          : "rgba(255,255,255,.30)");
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
    >
      {blur && (Platform.OS === "web" ? (
        <View
          testID="glass-backdrop"
          style={[
            StyleSheet.absoluteFill,
            {
              backdropFilter: navigation ? "blur(24px) saturate(145%)" : "blur(18px) saturate(128%)",
              WebkitBackdropFilter: navigation ? "blur(24px) saturate(145%)" : "blur(18px) saturate(128%)",
            } as ViewStyle,
          ]}
        />
      ) : (
        <BlurView
          tint={
            dark
              ? "systemUltraThinMaterialDark"
              : "systemUltraThinMaterialLight"
          }
          intensity={100}
          blurTarget={target || backdrop}
          blurMethod="dimezisBlurViewSdk31Plus"
          blurReductionFactor={2}
          style={StyleSheet.absoluteFill}
        />
      ))}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        aria-hidden
      >
        <Defs>
          {primary && <LinearGradient
            id={`${id}pigment`}
            gradientUnits="userSpaceOnUse"
            x1={0} y1={0} x2={100} y2={100}
          >
            <Stop offset={0} stopColor={dark ? "#FFAA70" : "#B74300"} stopOpacity={dark ? .94 : .99}/>
            <Stop offset={1} stopColor={dark ? "#E96B1F" : "#8D2F00"} stopOpacity={dark ? .94 : .99}/>
          </LinearGradient>}
          <LinearGradient
            id={id}
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={100}
            y2={100}
          >
            <Stop
              offset={0}
              stopColor="white"
              stopOpacity={primary ? 0.08 : navigation ? dark ? 0.18 : 0.28 : dark ? 0.1 : 0.18}
            />
            <Stop
              offset={1}
              stopColor="white"
              stopOpacity={primary ? 0.015 : navigation ? 0.06 : dark ? 0.025 : 0.035}
            />
          </LinearGradient>
        </Defs>
        {primary && <Rect width={100} height={100} fill={`url(#${id}pigment)`} />}
        <Rect width={100} height={100} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function GlassSurface({
  children,
  style,
  tone,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tone?: Tone }>) {
  return (
    <View
      style={[
        {
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 10px 28px rgba(0,0,0,.12)",
        },
        style,
        { borderWidth: 0 },
      ]}
    >
      <GlassBackdrop tone={tone} />
      {children}
    </View>
  );
}

/** Keeps native press, focus, loading and selection semantics across every button. */
export function GlassPressable({
  children,
  style,
  tone,
  glassColor,
  onFocus,
  onBlur,
  ...props
}: PressableProps & { tone?: Tone; glassColor?: string }) {
  const [focused, setFocused] = useState(false);
  const selected =
    props.accessibilityState?.selected ||
    props.accessibilityState?.checked === true ||
    props.accessibilityState?.expanded;
  return (
    <Pressable
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={(state) => {
        const original = StyleSheet.flatten(
          typeof style === "function" ? style(state) : style,
        );
        return [
          original,
          {
            backgroundColor: "transparent",
            borderWidth: 0,
            borderTopWidth: 0,
            borderBottomWidth: 0,
            borderLeftWidth: 0,
            borderRightWidth: 0,
            outlineWidth: 0,
            borderRadius: Math.max(
              12,
              typeof original?.borderRadius === "number"
                ? original.borderRadius
                : 0,
            ),
            overflow: "hidden",
            boxShadow: "0 5px 18px rgba(0,0,0,.12)",
          },
          focused && {
            boxShadow:
              "0 0 24px rgba(255,145,77,.32), 0 5px 18px rgba(0,0,0,.12)",
          },
        ];
      }}
    >
      {(state) => (
        <>
          <GlassBackdrop
            tone={tone || (selected ? "selected" : "neutral")}
            color={glassColor}
          />
          {typeof children === "function" ? children(state) : children}
        </>
      )}
    </Pressable>
  );
}
