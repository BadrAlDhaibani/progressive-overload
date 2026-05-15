export const BAR_OPTIONS = [45, 35, 15, 0] as const;
export const PLATE_SIZES = [45, 35, 25, 10, 5, 2.5] as const;

export interface BarbellTotal {
  total: number;
  perSideWeight: number;
}

export function computeBarbellTotal({
  barWeight,
  platesPerSide,
}: {
  barWeight: number;
  platesPerSide: Record<number, number>;
}): BarbellTotal {
  let perSideWeight = 0;
  for (const plate of PLATE_SIZES) {
    const count = platesPerSide[plate] ?? 0;
    perSideWeight += plate * count;
  }
  return {
    perSideWeight,
    total: barWeight + 2 * perSideWeight,
  };
}
