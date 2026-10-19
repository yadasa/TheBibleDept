/** A short virtual shutter: blur follows page velocity, never an unrelated pulse. */
export const MAX_MOTION_EXPOSURE = 3;
export const EXPOSURE_TAPS = [
  { offset: 0, weight: 0.4 },
  { offset: 0.25, weight: 0.22 },
  { offset: 0.5, weight: 0.18 },
  { offset: 0.75, weight: 0.12 },
  { offset: 1, weight: 0.08 },
] as const;

export function motionExposure(
  previousPage: number,
  nextPage: number,
  elapsedMs: number,
  pageWidth: number,
) {
  if (
    ![previousPage, nextPage, elapsedMs, pageWidth].every(Number.isFinite) ||
    elapsedMs <= 0 ||
    elapsedMs > 80 ||
    pageWidth <= 0 ||
    previousPage === nextPage
  ) {
    return 0;
  }
  const velocity = -((nextPage - previousPage) * pageWidth) / elapsedMs;
  return Math.max(
    -MAX_MOTION_EXPOSURE,
    Math.min(MAX_MOTION_EXPOSURE, velocity * 1.5),
  );
}

/** Convert weighted exposures into equivalent source-over image opacities. */
export function exposureOpacity(index: number) {
  const cumulative = EXPOSURE_TAPS.slice(0, index + 1).reduce(
    (sum, tap) => sum + tap.weight,
    0,
  );
  return EXPOSURE_TAPS[index].weight / cumulative;
}
