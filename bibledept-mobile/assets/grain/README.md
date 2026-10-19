# Background grain

These PNGs come from the app's existing `GrainBackground.tsx` SVG, rather than a new texture or external artwork. `scripts/generate-grain.cjs` preserves its seed `1729`, 1,000 rectangles, four random draws per rectangle, full subpixel coordinates, draw order, alpha values and 120 × 120 logical pixel tile. Flecks crossing a tile edge stay clipped, matching the original SVG pattern. Layer opacity stays `0.16` at runtime.

Each theme has 1×, 2× and 3× lossless RGBA PNGs. Their ink colors come directly from `src/themeColors.ts`. Native React Native Image uses `resizeMode="repeat"`, the Metro image scale and the current theme tint. Web repeats the themed asset at an explicit `background-size: 120px 120px`, so a high-density asset does not enlarge the grain. No CSS filter or additional SVG is needed. The existing full-height background now supplies the header's grain too.

React Native documents the [repeat behavior](https://reactnative.dev/docs/image#resizemode) and [automatic density selection for static images](https://reactnative.dev/docs/images#static-image-resources). Expo's [Asset API](https://docs.expo.dev/versions/latest/sdk/asset/#frommodulevirtualassetmodule) resolves the bundled web asset URL without downloading a separate texture.

Sharp is only needed to regenerate or check the assets; it is not an application dependency. With Sharp available to Node:

```sh
node scripts/generate-grain.cjs
node scripts/generate-grain.cjs --check
```

When using a separately installed tool runtime, pass `--sharp-module /absolute/path/to/sharp`. The checked-in images were generated with Sharp 0.35.5, librsvg 2.63.2 and Cairo 1.18.6. The script checks decoded RGBA pixels, rather than PNG compression bytes. For each theme and density it also independently renders a 3 × 3 copy of the original SVG pattern and requires an identical pixel result from the repeated PNG. This verifies the geometry, density, alpha composition and tile boundaries with the same rasterizer.
