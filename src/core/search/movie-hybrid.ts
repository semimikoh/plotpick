import { searchMovies, type MovieSearchResult } from "@/core/search/movie-vector";
import { searchMoviesByKeyword } from "@/core/search/movie-keyword";
import { RRF_K, calcTitleBoost, calcTitleMatchRatio, scaleScore } from "@/core/search/scoring";

const CAST_BOOST = 0.08;
const MIN_DISPLAY_SCORE = 0.15;

function calcCastBoost(result: MovieSearchResult, query: string): number {
  const queryLower = query.toLowerCase();
  const cast = result.cast_members ?? [];
  const director = result.director ?? "";
  const matched = cast.some((c) => queryLower.includes(c.toLowerCase()))
    || (director && queryLower.includes(director.toLowerCase()));
  return matched ? CAST_BOOST : 0;
}

function calcCastMatchRatio(result: MovieSearchResult, query: string): number {
  const queryLower = query.toLowerCase();
  const cast = result.cast_members ?? [];
  const director = result.director ?? "";
  if (cast.some((c) => queryLower.includes(c.toLowerCase()))) return 0.5;
  if (director && queryLower.includes(director.toLowerCase())) return 0.4;
  return 0;
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
    return { ...s.result, similarity: scaleScore(absSim, titleMatch, castMatch) };
  });

  return results.filter((r) => r.similarity >= MIN_DISPLAY_SCORE);
}
