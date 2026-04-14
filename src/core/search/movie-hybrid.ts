import { searchMovies, type MovieSearchResult } from "@/core/search/movie-vector";
import { searchMoviesByKeyword } from "@/core/search/movie-keyword";

const RRF_K = 60;
const TITLE_BOOST = 0.05;
const CAST_BOOST = 0.08;
const MIN_DISPLAY_SCORE = 0.15;

function calcTitleBoost(title: string, query: string): number {
  const titleLower = title.toLowerCase();
  const words = query.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  const hits = words.filter((w) => titleLower.includes(w.toLowerCase())).length;
  return TITLE_BOOST * (hits / words.length);
}

function calcCastBoost(result: MovieSearchResult, query: string): number {
  const queryLower = query.toLowerCase();
  const cast = result.cast_members ?? [];
  const director = result.director ?? "";
  const matched = cast.some((c) => queryLower.includes(c.toLowerCase()))
    || (director && queryLower.includes(director.toLowerCase()));
  return matched ? CAST_BOOST : 0;
}

function calcTitleMatchRatio(title: string, query: string): number {
  const titleLower = title.toLowerCase().replace(/[:\-\s]+/g, "");
  const queryLower = query.toLowerCase().replace(/[:\-\s]+/g, "");
  if (titleLower === queryLower || queryLower === titleLower) return 1;
  if (titleLower.includes(queryLower) || queryLower.includes(titleLower)) return 0.8;
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return 0;
  const hits = words.filter((w) => titleLower.includes(w.toLowerCase())).length;
  return hits / words.length * 0.5;
}

function calcCastMatchRatio(result: MovieSearchResult, query: string): number {
  const queryLower = query.toLowerCase();
  const cast = result.cast_members ?? [];
  const director = result.director ?? "";
  if (cast.some((c) => queryLower.includes(c.toLowerCase()))) return 0.5;
  if (director && queryLower.includes(director.toLowerCase())) return 0.4;
  return 0;
}

function scaleScore(rawSim: number, titleMatch: number, castMatch: number): number {
  const boosted = rawSim + titleMatch * 0.4 + castMatch * 0.3;
  const scaled = (boosted - 0.25) / 0.45;
  return Math.min(1, Math.max(0, scaled));
}

export async function hybridMovieSearch(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<MovieSearchResult[]> {
  const count = options?.count ?? 10;

  const [vectorResults, keywordResults] = await Promise.all([
    searchMovies(query, { count, genres: options?.genres }),
    searchMoviesByKeyword(query, { count, genres: options?.genres }),
  ]);

  // 벡터 검색의 절대 유사도를 보존
  const vectorSimilarities = new Map<string, number>();
  for (const r of vectorResults) {
    vectorSimilarities.set(r.id, r.similarity);
  }

  const scores = new Map<string, { score: number; result: MovieSearchResult }>();

  for (const [rank, r] of vectorResults.entries()) {
    const rrf = 1 / (RRF_K + rank + 1);
    const boost = calcTitleBoost(r.title, query) + calcCastBoost(r, query);
    const existing = scores.get(r.id);
    scores.set(r.id, {
      score: (existing?.score ?? 0) + rrf + boost,
      result: existing?.result ?? r,
    });
  }

  for (const [rank, r] of keywordResults.entries()) {
    const rrf = 1 / (RRF_K + rank + 1);
    const boost = calcTitleBoost(r.title, query) + calcCastBoost(r, query);
    const existing = scores.get(r.id);
    scores.set(r.id, {
      score: (existing?.score ?? 0) + rrf + boost,
      result: existing?.result ?? { ...r, similarity: 0 },
    });
  }

  const sorted = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  const results = sorted.map((s) => {
    const absSim = vectorSimilarities.get(s.result.id) ?? 0.3;
    const titleMatch = calcTitleMatchRatio(s.result.title, query);
    const castMatch = calcCastMatchRatio(s.result, query);
    const similarity = scaleScore(absSim, titleMatch, castMatch);
    return { ...s.result, similarity };
  });

  return results.filter((r) => r.similarity >= MIN_DISPLAY_SCORE);
}
