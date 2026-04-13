import { getSupabase } from "@/core/db/supabase";

export async function getFeedbackBoosts(
  query: string,
): Promise<Map<string, number>> {
  const boosts = new Map<string, number>();

  // 같은 검색어 또는 유사한 검색어로 선택된 웹툰 조회
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1).slice(0, 3);
  if (words.length === 0) return boosts;

  const filters = words.map((w) => `query.ilike.%${w}%`).join(",");

  const { data, error } = await getSupabase()
    .from("search_feedback")
    .select("webtoon_id")
    .or(filters)
    .limit(50);

  if (error || !data) return boosts;

  // 선택 횟수에 따라 부스트 점수 부여
  for (const row of data) {
    const current = boosts.get(row.webtoon_id) ?? 0;
    boosts.set(row.webtoon_id, current + 1);
  }

  return boosts;
}
