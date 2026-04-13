import { searchWebtoons, type SearchResult } from "@/core/search/vector";
import { searchByKeyword } from "@/core/search/keyword";
import { getFeedbackBoosts } from "@/core/search/feedback";

const RRF_K = 60;
const TITLE_BOOST = 0.05;
const FEEDBACK_BOOST = 0.03;

function calcTitleBoost(title: string, query: string): number {
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  const words = queryLower.trim().split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return 0;

  // 제목에 매칭되는 단어 비율에 따라 부스트
  const hits = words.filter((w) => titleLower.includes(w)).length;
  return TITLE_BOOST * (hits / words.length);
}

export async function hybridSearch(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<SearchResult[]> {
  const count = options?.count ?? 10;

  // 벡터 + 키워드 + 피드백 병렬 실행
  const [vectorResults, keywordResults, feedbackBoosts] = await Promise.all([
    searchWebtoons(query, { count, genres: options?.genres }),
    searchByKeyword(query, { count, genres: options?.genres }),
    getFeedbackBoosts(query),
  ]);

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

  // RRF 점수 기준 정렬, similarity에 정규화된 RRF 점수 반영
  const sorted = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  const maxScore = sorted[0]?.score ?? 1;

  return sorted.map((s) => ({
    ...s.result,
    similarity: s.score / maxScore,
  }));
}
