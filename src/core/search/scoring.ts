export const RRF_K = 60;
export const TITLE_BOOST = 0.05;

export function calcTitleBoost(title: string, query: string): number {
  const titleLower = title.toLowerCase();
  const words = query.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  const hits = words.filter((w) => titleLower.includes(w.toLowerCase())).length;
  return TITLE_BOOST * (hits / words.length);
}

export function calcTitleMatchRatio(title: string, query: string): number {
  const titleLower = title.toLowerCase().replace(/[:\-\s]+/g, "");
  const queryLower = query.toLowerCase().replace(/[:\-\s]+/g, "");
  if (titleLower === queryLower || queryLower === titleLower) return 1;
  if (titleLower.includes(queryLower) || queryLower.includes(titleLower)) return 0.8;
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return 0;
  const hits = words.filter((w) => titleLower.includes(w.toLowerCase())).length;
  return hits / words.length * 0.5;
}

export function scaleScore(rawSim: number, titleMatch: number, castMatch: number = 0): number {
  const boosted = rawSim + titleMatch * 0.4 + castMatch * 0.3;
  const scaled = (boosted - 0.25) / 0.45;
  return Math.min(1, Math.max(0, scaled));
}
