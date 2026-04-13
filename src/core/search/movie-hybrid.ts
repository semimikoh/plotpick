import { searchMovies, type MovieSearchResult } from "@/core/search/movie-vector";
import { searchMoviesByKeyword } from "@/core/search/movie-keyword";

const RRF_K = 60;
const TITLE_BOOST = 0.05;

function calcTitleBoost(title: string, query: string): number {
  const titleLower = title.toLowerCase();
  const words = query.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  const hits = words.filter((w) => titleLower.includes(w.toLowerCase())).length;
  return TITLE_BOOST * (hits / words.length);
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

  const scores = new Map<string, { score: number; result: MovieSearchResult }>();

  for (const [rank, r] of vectorResults.entries()) {
    const rrf = 1 / (RRF_K + rank + 1);
    const boost = calcTitleBoost(r.title, query);
    const existing = scores.get(r.id);
    scores.set(r.id, {
      score: (existing?.score ?? 0) + rrf + boost,
      result: existing?.result ?? r,
    });
  }

  for (const [rank, r] of keywordResults.entries()) {
    const rrf = 1 / (RRF_K + rank + 1);
    const boost = calcTitleBoost(r.title, query);
    const existing = scores.get(r.id);
    scores.set(r.id, {
      score: (existing?.score ?? 0) + rrf + boost,
      result: existing?.result ?? { ...r, similarity: 0 },
    });
  }

  const sorted = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  const maxScore = sorted[0]?.score ?? 1;

  return sorted.map((s) => ({
    ...s.result,
    similarity: s.score / maxScore,
  }));
}
