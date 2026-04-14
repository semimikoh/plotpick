import { getSupabase } from "@/core/db/supabase";
import type { SearchResult } from "@/core/search/vector";
import { escapeIlike, extractWords } from "@/core/search/keyword-utils";

function buildWordFilters(query: string): string {
  const words = extractWords(query).slice(0, 5);

  if (words.length === 0) {
    return "title.ilike.%%";
  }

  return words
    .map((w) => {
      const escaped = escapeIlike(w);
      return `title.ilike.%${escaped}%,description.ilike.%${escaped}%`;
    })
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

  const words = query.trim().split(/\s+/).filter((w) => w.length > 0);

  return (data ?? []).map((r) => {
    const titleLower = r.title.toLowerCase();
    const titleWordHits = words.filter((w) => titleLower.includes(w.toLowerCase())).length;
    const similarity = titleWordHits > 0 ? 0.8 + 0.2 * (titleWordHits / words.length) : 0.5;
    return { ...r, similarity };
  });
}
