import { getSupabase } from "@/core/db/supabase";
import type { SearchResult } from "@/core/search/vector";

function buildWordFilters(query: string): string {
  const words = query
    .trim()
    .replace(/[,."'()[\]{}]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 5);

  if (words.length === 0) {
    return "title.ilike.%%";
  }

  // 각 단어에 대해 제목 OR 설명 매칭, 단어들은 OR로 연결
  return words
    .map((w) => `title.ilike.%${w}%,description.ilike.%${w}%`)
    .join(",");
}

export async function searchByKeyword(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<SearchResult[]> {
  const count = options?.count ?? 10;
  const genres = options?.genres ?? null;

  let builder = getSupabase()
    .from("webtoons")
    .select("id, title, description, url, genres, platform, source")
    .or(buildWordFilters(query))
    .limit(count);

  if (genres && genres.length > 0) {
    builder = builder.overlaps("genres", genres);
  }

  const { data, error } = await builder;

  if (error) {
    throw new Error(`키워드 검색 실패: ${error.message}`);
  }

  // 제목 정확 매칭에 높은 점수, 설명만 매칭은 낮은 점수
  const queryLower = query.toLowerCase();
  const words = query.trim().split(/\s+/).filter((w) => w.length > 0);

  return (data ?? []).map((r) => {
    const titleLower = r.title.toLowerCase();
    const titleWordHits = words.filter((w) => titleLower.includes(w.toLowerCase())).length;
    const similarity = titleWordHits > 0 ? 0.8 + 0.2 * (titleWordHits / words.length) : 0.5;

    return { ...r, similarity };
  });
}
