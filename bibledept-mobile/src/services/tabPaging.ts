export const tabOrder = [
  "Notes",
  "Prayer",
  "Home",
  "Bible",
  "Account",
] as const;
export type Tab = (typeof tabOrder)[number];
export type PageJourney = { from: number; to: number };

export function pagePosition(journey: PageJourney, progress: number) {
  return journey.from + (journey.to - journey.from) * progress;
}

/** Include every page crossed, including both sides of an interrupted swipe. */
export function pagesCrossed(from: number, to: number): Tab[] {
  return tabOrder.filter(
    (_, index) =>
      index >= Math.floor(Math.min(from, to)) &&
      index <= Math.ceil(Math.max(from, to)),
  );
}

export function journeyDuration(from: number, to: number) {
  return 430 + Math.max(0, Math.min(4, Math.abs(to - from)) - 1) * 90;
}
