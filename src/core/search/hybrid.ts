import { searchWebtoons, type SearchResult } from "@/core/search/vector";
import { searchByKeyword } from "@/core/search/keyword";

export async function hybridSearch(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<SearchResult[]> {
  const count = options?.count ?? 10;

  // 벡터 + 키워드 병렬 실행
  const [vectorResults, keywordResults] = await Promise.all([
    searchWebtoons(query, { count, genres: options?.genres }),
    searchByKeyword(query, { count, genres: options?.genres }),
  ]);

  // RRF (Reciprocal Rank Fusion)
  const K = 60; // RRF 상수
  const scores = new Map<string, { score: number; result: SearchResult }>();

  for (const [rank, r] of vectorResults.entries()) {
    const rrf = 1 / (K + rank + 1);
    const existing = scores.get(r.id);
    scores.set(r.id, {
      score: (existing?.score ?? 0) + rrf,
      result: existing?.result ?? r,
    });
  }

  for (const [rank, r] of keywordResults.entries()) {
    const rrf = 1 / (K + rank + 1);
    const existing = scores.get(r.id);
    scores.set(r.id, {
      score: (existing?.score ?? 0) + rrf,
      result: existing?.result ?? { ...r, similarity: 0 },
    });
  }

  // RRF 점수 기준 정렬, similarity에 정규화된 RRF 점수 반영
  const sorted = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  const maxScore = sorted[0]?.score ?? 1;

  return sorted.map((s) => ({
    ...s.result,
    similarity: s.score / maxScore, // 0~1 정규화
  }));
}
