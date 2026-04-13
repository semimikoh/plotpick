import { getSupabase } from "@/core/db/supabase";
import type { MovieSearchResult } from "@/core/search/movie-vector";

function buildWordFilters(query: string): string {
  const words = query
    .trim()
    .replace(/[,."'()[\]{}]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 5);

  if (words.length === 0) return "title.ilike.%%";

  return words
    .map((w) => `title.ilike.%${w}%,description.ilike.%${w}%`)
    .join(",");
}

export async function searchMoviesByKeyword(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<MovieSearchResult[]> {
  const count = options?.count ?? 10;
  const genres = options?.genres ?? null;

  let builder = getSupabase()
    .from("movies")
    .select("id, title, description, url, genres, rating, release_date, poster_url")
    .or(buildWordFilters(query))
    .limit(count);

  if (genres && genres.length > 0) {
    builder = builder.overlaps("genres", genres);
  }

  const { data, error } = await builder;

  if (error) {
    throw new Error(`영화 키워드 검색 실패: ${error.message}`);
  }

  const queryLower = query.toLowerCase();
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1);

  return (data ?? []).map((r) => {
    const titleLower = r.title.toLowerCase();
    const hits = words.filter((w) => titleLower.includes(w.toLowerCase())).length;
    const similarity = hits > 0 ? 0.8 + 0.2 * (hits / words.length) : 0.5;
    return { ...r, similarity };
  });
}
