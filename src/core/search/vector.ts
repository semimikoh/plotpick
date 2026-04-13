import { getSupabase } from "@/core/db/supabase";
import { embedTexts } from "@/core/embeddings/openai";

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  genres: string[];
  platform: string;
  source: string;
  similarity: number;
}

export async function searchWebtoons(
  query: string,
  options?: { count?: number; genres?: string[] },
): Promise<SearchResult[]> {
  const count = options?.count ?? 10;
  const genres = options?.genres ?? null;

  // 쿼리를 벡터로 변환
  const [embedding] = await embedTexts([query]);

  // RPC 호출
  const { data, error } = await getSupabase().rpc("match_webtoons", {
    query_embedding: JSON.stringify(embedding),
    match_count: count,
    filter_genres: genres,
  });

  if (error) {
    throw new Error(`검색 실패: ${error.message}`);
  }

  return data as SearchResult[];
}
