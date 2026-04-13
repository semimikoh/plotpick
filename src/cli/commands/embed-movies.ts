import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RawMovie } from "@/core/tmdb/fetch";
import { embedTexts } from "@/core/embeddings/openai";
import { getSupabase } from "@/core/db/supabase";

export async function embedMoviesCommand() {
  const rawPath = resolve(process.cwd(), "data/movies_raw.json");
  const movies: RawMovie[] = JSON.parse(await readFile(rawPath, "utf-8"));
  console.log(`[embed-movies] ${movies.length}편 로드`);

  // 임베딩용 텍스트 (배우/감독 포함)
  const texts = movies.map((m) => {
    const parts = [`제목: ${m.title}`];
    if (m.genres.length > 0) parts.push(`장르: ${m.genres.join(", ")}`);
    if (m.director) parts.push(`감독: ${m.director}`);
    if (m.cast && m.cast.length > 0) parts.push(`출연: ${m.cast.join(", ")}`);
    if (m.releaseDate) parts.push(`개봉: ${m.releaseDate}`);
    parts.push(`설명: ${m.overview}`);
    return parts.join("\n");
  });

  console.log("[embed-movies] OpenAI 임베딩 시작...");
  const embeddings = await embedTexts(texts);
  console.log(`[embed-movies] ${embeddings.length}개 벡터 생성`);

  // Supabase에 upsert
  const supabase = getSupabase();
  const CHUNK = 50;

  for (let i = 0; i < movies.length; i += CHUNK) {
    const batch = movies.slice(i, i + CHUNK).map((m, j) => ({
      id: `tmdb-${m.id}`,
      title: m.title,
      description: m.overview,
      url: `https://www.themoviedb.org/movie/${m.id}?language=ko-KR`,
      genres: m.genres,
      rating: m.rating,
      release_date: m.releaseDate,
      poster_url: m.posterUrl,
      embedding: JSON.stringify(embeddings[i + j]),
    }));

    const { error } = await supabase.from("movies").upsert(batch);
    if (error) {
      console.error(`[embed-movies] upsert 실패:`, error.message);
      process.exit(1);
    }
    console.log(`[embed-movies] DB 적재 ${Math.min(i + CHUNK, movies.length)}/${movies.length}`);
  }

  console.log(`[embed-movies] 완료: ${movies.length}편`);
}
