import { getSupabase } from "@/core/db/supabase";
import type { MovieSearchResult } from "@/core/search/movie-vector";

function extractWords(query: string): string[] {
  return query
    .trim()
    .replace(/[,."'()[\]{}]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function buildWordFilters(query: string): string {
  const words = extractWords(query).slice(0, 5);

  if (words.length === 0) return "title.ilike.%%";

  return words
    .map((w) => `title.ilike.%${w}%,description.ilike.%${w}%,director.ilike.%${w}%`)
    .join(",");
}

async function searchByCast(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<MovieSearchResult[]> {
  const words = extractWords(query);
  if (words.length === 0) return [];

  // 연속된 2~3 단어 조합으로 이름 매칭 시도 (e.g. "제임스 맥어보이")
  const nameCandidates: string[] = [];
  for (let i = 0; i < words.length; i++) {
    // 한글 2글자 이상 단어만 이름 후보
    if (words[i].length < 2) continue;
    nameCandidates.push(words[i]);
    if (i + 1 < words.length) {
      nameCandidates.push(`${words[i]} ${words[i + 1]}`);
    }
    if (i + 2 < words.length) {
      nameCandidates.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  const supabase = getSupabase();
  const allResults = new Map<string, MovieSearchResult>();

  // 각 이름 후보로 cast 검색
  for (const name of nameCandidates) {
    const { data, error } = await supabase.rpc("search_movies_by_cast", {
      search_query: name,
      match_count: options?.count ?? 10,
      filter_genres: options?.genres ?? null,
    });

    if (error) {
      console.error("[movie-keyword] cast 검색 실패:", error.message);
      continue;
    }

    for (const r of (data ?? []) as MovieSearchResult[]) {
      if (!allResults.has(r.id)) {
        allResults.set(r.id, r);
      }
    }

    // 결과가 나오면 더 긴 조합은 이미 좋은 매칭
    if ((data ?? []).length > 0 && name.includes(" ")) break;
  }

  return [...allResults.values()].slice(0, options?.count ?? 10);
}

export async function searchMoviesByKeyword(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<MovieSearchResult[]> {
  const count = options?.count ?? 10;
  const genres = options?.genres ?? null;

  let builder = getSupabase()
    .from("movies")
    .select("id, title, description, url, genres, rating, release_date, poster_url, cast_members, director")
    .or(buildWordFilters(query))
    .limit(count);

  if (genres && genres.length > 0) {
    builder = builder.overlaps("genres", genres);
  }

  const [{ data, error }, castResults] = await Promise.all([
    builder,
    searchByCast(query, options),
  ]);

  if (error) {
    throw new Error(`영화 키워드 검색 실패: ${error.message}`);
  }

  const words = extractWords(query);

  const results = new Map<string, MovieSearchResult>();

  for (const r of data ?? []) {
    const titleLower = r.title.toLowerCase();
    const hits = words.filter((w) => titleLower.includes(w.toLowerCase())).length;
    const similarity = hits > 0 ? 0.8 + 0.2 * (hits / words.length) : 0.5;
    results.set(r.id, { ...r, similarity });
  }

  // cast 검색 결과 머지
  for (const r of castResults) {
    const existing = results.get(r.id);
    if (!existing || existing.similarity < r.similarity) {
      results.set(r.id, r);
    }
  }

  return [...results.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, count);
}
