export type IndicatorPosition = { left: number; width: number };
export const NAV_PADDING = 7;
export const NAV_GAP = 4;

/** Both visual rows must share these widths for a moving spatial mask. */
export function navigationMetrics(width: number) {
  const rowWidth = Math.max(0, width - NAV_PADDING * 2);
  return { rowWidth, cellWidth: Math.max(0, (rowWidth - NAV_GAP * 4) / 5) };
}
type IndicatorJourney = {
  left: readonly [number, number, number, number];
  width: readonly [number, number, number, number];
};

/** Preserve the original liquid stretch, starting at the actual visible pill. */
export function indicatorJourney(
  from: IndicatorPosition,
  target: number,
  cell: number,
): IndicatorJourney {
  const delta = target - from.left;
  const stretch = Math.min(Math.abs(delta) * 0.42 + 14, 76);
  const trailing = Math.min(stretch * 0.48, 34);
  return {
    left: delta >= 0
      ? [from.left, from.left, target - trailing, target]
      : [from.left, from.left - stretch, target, target],
    width: [from.width, from.width + stretch, cell + trailing, cell],
  };
}

/** Stable coordinates avoid rebasing an old interpolation during a fast tap. */
export function indicatorPosition(journey: IndicatorJourney, progress: number): IndicatorPosition {
  const value = Math.max(0, Math.min(1, progress));
  const stops = [0, 0.24, 0.72, 1];
  const segment = value < 0.24 ? 0 : value < 0.72 ? 1 : 2;
  const fraction = (value - stops[segment]) / (stops[segment + 1] - stops[segment]);
  return {
    left: journey.left[segment] + (journey.left[segment + 1] - journey.left[segment]) * fraction,
    width: journey.width[segment] + (journey.width[segment + 1] - journey.width[segment]) * fraction,
  };
}
