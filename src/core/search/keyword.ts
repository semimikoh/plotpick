import { getSupabase } from "@/core/db/supabase";
import type { SearchResult } from "@/core/search/vector";

export async function searchByKeyword(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<SearchResult[]> {
  const count = options?.count ?? 10;
  const genres = options?.genres ?? null;

  let builder = getSupabase()
    .from("webtoons")
    .select("id, title, description, url, genres, platform, source")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(count);

  if (genres && genres.length > 0) {
    builder = builder.overlaps("genres", genres);
  }

  const { data, error } = await builder;

  if (error) {
    throw new Error(`키워드 검색 실패: ${error.message}`);
  }

  return (data ?? []).map((r) => ({
    ...r,
    similarity: 1.0, // 정확 매칭은 최고 점수
  }));
}
