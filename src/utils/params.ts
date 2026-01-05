export const parseMarkersParam = (raw: string | string[] | undefined): number[] => {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => Number(item)).filter((n) => !Number.isNaN(n));
    }
  } catch (err) {
    console.warn('Failed to parse markers', err);
  }
  return [];
};
