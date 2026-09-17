const DESIGN_WIDTH = 390;

export function calculateScreenLift({
  viewportWidth,
  viewportHeight,
  contentBottom,
  safeBottom,
  maxLift,
  minFitHeight,
}: {
  viewportWidth: number;
  viewportHeight: number;
  contentBottom: number;
  safeBottom: number;
  maxLift: number;
  minFitHeight: number;
}): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || viewportWidth >= 768) return 0;
  const scale = viewportWidth / DESIGN_WIDTH;
  const availableDesignHeight = viewportHeight / scale;
  if (availableDesignHeight < minFitHeight) return 0;
  return Math.min(maxLift, Math.max(0, Math.ceil(contentBottom + safeBottom - availableDesignHeight)));
}
