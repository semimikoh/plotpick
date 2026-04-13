import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CleanedWebtoon } from "@/core/data/clean";
import { embedTexts } from "@/core/embeddings/openai";
import { getSupabase } from "@/core/db/supabase";

export async function embedCommand() {
  const cleanedPath = resolve(process.cwd(), "data/cleaned.json");
  const webtoons: CleanedWebtoon[] = JSON.parse(
    await readFile(cleanedPath, "utf-8"),
  );
  console.log(`[embed] cleaned.json: ${webtoons.length}편 로드`);

  // 임베딩용 텍스트: 제목 + 장르 + 설명을 하나로 합침
  const texts = webtoons.map((w) => {
    const genreStr = w.genres.length > 0 ? `[${w.genres.join(", ")}] ` : "";
    return `${w.title} ${genreStr}${w.description}`;
  });

  console.log("[embed] OpenAI 임베딩 시작...");
  const embeddings = await embedTexts(texts);
  console.log(`[embed] ${embeddings.length}개 벡터 생성 완료`);

  // Supabase에 upsert
  const supabase = getSupabase();
  const CHUNK = 50;

  for (let i = 0; i < webtoons.length; i += CHUNK) {
    const batch = webtoons.slice(i, i + CHUNK).map((w, j) => ({
      id: w.id,
      title: w.title,
      description: w.description,
      url: w.url,
      genres: w.genres,
      platform: w.platform,
      source: w.source,
      embedding: JSON.stringify(embeddings[i + j]),
    }));

    const { error } = await supabase.from("webtoons").upsert(batch);
    if (error) {
      console.error(`[embed] upsert 실패 (batch ${i}):`, error.message);
      process.exit(1);
    }
    console.log(
      `[embed] DB 적재 ${Math.min(i + CHUNK, webtoons.length)}/${webtoons.length}`,
    );
  }

  console.log(`[embed] 완료: ${webtoons.length}편 임베딩 + DB 적재`);
}
