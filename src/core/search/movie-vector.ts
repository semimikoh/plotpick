import { getSupabase } from "@/core/db/supabase";
import { embedTexts } from "@/core/embeddings/openai";

export interface MovieSearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  genres: string[];
  rating: number;
  release_date: string;
  poster_url: string | null;
  similarity: number;
}

export async function searchMovies(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<MovieSearchResult[]> {
  const count = options?.count ?? 10;
  const genres = options?.genres ?? null;

  const [embedding] = await embedTexts([query]);

  const { data, error } = await getSupabase().rpc("match_movies", {
    query_embedding: JSON.stringify(embedding),
    match_count: count,
    filter_genres: genres,
  });

  if (error) {
    throw new Error(`영화 검색 실패: ${error.message}`);
  }

  return data as MovieSearchResult[];
}
