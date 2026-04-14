import { searchWebtoons, type SearchResult } from "@/core/search/vector";
import { searchByKeyword } from "@/core/search/keyword";
import { getFeedbackBoosts } from "@/core/search/feedback";

const RRF_K = 60;
const TITLE_BOOST = 0.05;
const FEEDBACK_BOOST = 0.03;
const MIN_DISPLAY_SCORE = 0.25;

function calcTitleBoost(title: string, query: string): number {
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  const words = queryLower.trim().split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return 0;

  const hits = words.filter((w) => titleLower.includes(w)).length;
  return TITLE_BOOST * (hits / words.length);
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

function scaleScore(rawSim: number, titleMatch: number): number {
  const boosted = rawSim + titleMatch * 0.4;
  const scaled = (boosted - 0.25) / 0.45;
  return Math.min(1, Math.max(0, scaled));
}

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

  // 벡터 검색의 절대 유사도를 보존
  const vectorSimilarities = new Map<string, number>();
  for (const r of vectorResults) {
    vectorSimilarities.set(r.id, r.similarity);
  }

  // RRF (Reciprocal Rank Fusion) + 제목 부스트
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

  // 피드백 부스트 적용
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
    const similarity = scaleScore(absSim, titleMatch);
    return { ...s.result, similarity };
  });

  return results.filter((r) => r.similarity >= MIN_DISPLAY_SCORE);
}
