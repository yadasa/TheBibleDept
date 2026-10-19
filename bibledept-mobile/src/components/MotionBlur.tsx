import {
  createElement,
  forwardRef,
  PropsWithChildren,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Animated, Platform, StyleSheet, View, ViewStyle } from "react-native";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { EXPOSURE_TAPS, exposureOpacity, motionExposure } from "../services/motionExposure";

export type MotionBlurHandle = {
  prepare: (from: number, immediate: boolean) => Promise<void>;
  finish: () => void;
};

/** Horizontal shutter samples of real content; no Gaussian blur or timed blur pulse. */
export const MotionBlur = forwardRef<
  MotionBlurHandle,
  PropsWithChildren<{ position: Animated.Value; pageWidth: number }>
>(function MotionBlur({ children, position, pageWidth }, ref) {
  const captureTarget = useRef<View>(null);
  const sequence = useRef(0);
  const [snapshot, setSnapshot] = useState<{ uri: string; from: number }>();
  const snapshotRef = useRef<typeof snapshot>(undefined);
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const last = useRef<{ page: number; time: number } | undefined>(undefined);
  const offsets = useRef<Array<SVGElement | null>>([]);
  const exposure = useRef(new Animated.Value(0)).current;
  const translation = useRef(new Animated.Value(0)).current;
  const id = `motion${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  function clear() {
    sequence.current += 1;
    enabledRef.current = false;
    snapshotRef.current = undefined;
    last.current = undefined;
    exposure.setValue(0);
    translation.setValue(0);
    setEnabled(false);
    setSnapshot(undefined);
    offsets.current.forEach(node => node?.setAttribute("dx", "0"));
  }

  useImperativeHandle(ref, () => ({
    finish: clear,
    async prepare(from, immediate) {
      clear();
      if (immediate) return;
      const token = sequence.current;
      last.current = { page: from, time: performance.now() };
      if (Platform.OS === "web") {
        enabledRef.current = true;
        setEnabled(true);
        return;
      }
      // Capture the viewport once, not duplicate React screens. This preserves
      // the player, forms and retained scrolling state during the exposure.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (token !== sequence.current || !captureTarget.current) return;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const pending = captureRef(captureTarget, { format: "png", result: "tmpfile" })
        .then(uri => {
          if (token !== sequence.current) { releaseCapture(uri); return undefined; }
          return uri;
        })
        .catch(() => undefined);
      const uri = await Promise.race([
        pending,
        new Promise<undefined>(resolve => { timeout = setTimeout(() => resolve(undefined), 100); }),
      ]);
      if (timeout) clearTimeout(timeout);
      if (token !== sequence.current) {
        if (uri) releaseCapture(uri);
        return;
      }
      if (!uri) { sequence.current += 1; return; }
      const image = { uri, from };
      snapshotRef.current = image;
      last.current = { page: from, time: performance.now() };
      enabledRef.current = true;
      setSnapshot(image);
    },
  }));

  useEffect(() => {
    const listener = position.addListener(({ value }) => {
      if (!enabledRef.current) return;
      const time = performance.now();
      const previous = last.current;
      last.current = { page: value, time };
      const distance = previous ? motionExposure(previous.page, value, time - previous.time, pageWidth) : 0;
      if (Platform.OS === "web") {
        offsets.current.forEach((node, index) => {
          node?.setAttribute("dx", String(-distance * EXPOSURE_TAPS[index].offset));
        });
      } else {
        exposure.setValue(-distance);
        if (snapshotRef.current) translation.setValue(-(value - snapshotRef.current.from) * pageWidth);
      }
    });
    return () => position.removeListener(listener);
  }, [position, pageWidth, exposure, translation]);

  useEffect(() => () => { if (snapshot) releaseCapture(snapshot.uri); }, [snapshot]);
  // A rotation/resized viewport invalidates the captured pixel coordinates.
  useEffect(() => { clear(); }, [pageWidth]);
  useEffect(() => () => { sequence.current += 1; enabledRef.current = false; }, []);

  return <View testID="page-motion-blur" style={s.viewport}>
    {Platform.OS === "web" && createElement("svg", {
      width: 0, height: 0, "aria-hidden": true, focusable: false,
      style: { position: "absolute", pointerEvents: "none" },
    }, createElement("defs", null, createElement("filter", {
      id, x: "-2%", y: "0%", width: "104%", height: "100%", colorInterpolationFilters: "sRGB",
    }, ...EXPOSURE_TAPS.flatMap((tap, index) => [
      createElement("feColorMatrix", {
        key: `weight${index}`, in: "SourceGraphic", type: "matrix", result: `weighted${index}`,
        values: `1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${tap.weight} 0`,
      }),
      createElement("feOffset", {
        key: `offset${index}`, in: `weighted${index}`, result: `sample${index}`, dx: 0, dy: 0,
        ref: (node: SVGElement | null) => { offsets.current[index] = node; },
      }),
      ...(index ? [createElement("feComposite", {
        key: `sum${index}`, in: index === 1 ? "sample0" : `sum${index - 1}`,
        in2: `sample${index}`, result: `sum${index}`, operator: "arithmetic", k1: 0, k2: 1, k3: 1, k4: 0,
      })] : []),
    ]))))}
    <View ref={captureTarget} collapsable={false} style={[
      s.viewport,
      Platform.OS === "web" && enabled && { filter: `url(#${id})` } as ViewStyle,
    ]}>{children}</View>
    {snapshot && <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      {EXPOSURE_TAPS.slice(1).map((tap, index) => <Animated.Image
        key={tap.offset}
        source={{ uri: snapshot.uri }}
        resizeMode="stretch"
        style={[
          StyleSheet.absoluteFill,
          { opacity: exposureOpacity(index + 1), transform: [{ translateX: Animated.add(translation, Animated.multiply(exposure, tap.offset)) }] },
        ]}
      />)}
    </View>}
  </View>;
});

const s = StyleSheet.create({ viewport: { flex: 1, overflow: "hidden" } });
