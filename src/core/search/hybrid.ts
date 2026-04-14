import { searchWebtoons, type SearchResult } from "@/core/search/vector";
import { searchByKeyword } from "@/core/search/keyword";
import { getFeedbackBoosts } from "@/core/search/feedback";
import { RRF_K, calcTitleBoost, calcTitleMatchRatio, scaleScore } from "@/core/search/scoring";

const FEEDBACK_BOOST = 0.03;
const MIN_DISPLAY_SCORE = 0.25;

export async function hybridSearch(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<SearchResult[]> {
  const count = options?.count ?? 10;

  const [vectorResults, keywordResults, feedbackBoosts] = await Promise.all([
    searchWebtoons(query, { count, genres: options?.genres }),
    searchByKeyword(query, { count, genres: options?.genres }),
    getFeedbackBoosts(query),
  ]);

  const vectorSimilarities = new Map<string, number>();
  for (const r of vectorResults) {
    vectorSimilarities.set(r.id, r.similarity);
  }

  const scores = new Map<string, { score: number; result: SearchResult }>();

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

  for (const [id, count] of feedbackBoosts) {
    const existing = scores.get(id);
    if (existing) {
      existing.score += FEEDBACK_BOOST * Math.min(count, 5);
    }
  }

  const sorted = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  const results = sorted.map((s) => {
    const absSim = vectorSimilarities.get(s.result.id) ?? 0.3;
    const titleMatch = calcTitleMatchRatio(s.result.title, query);
    return { ...s.result, similarity: scaleScore(absSim, titleMatch) };
  });

  return results.filter((r) => r.similarity >= MIN_DISPLAY_SCORE);
}
