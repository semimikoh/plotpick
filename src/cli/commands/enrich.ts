import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CleanedWebtoon } from "@/core/data/clean";
import { enrichBatch } from "@/core/llm/enrich";

const MIN_DESC_LENGTH = 30;

export async function enrichCommand() {
  const cleanedPath = resolve(process.cwd(), "data/cleaned.json");
  const webtoons: CleanedWebtoon[] = JSON.parse(
    await readFile(cleanedPath, "utf-8"),
  );

  // 설명이 짧은 작품만 필터
  const needsEnrich = webtoons.filter(
    (w) => w.description.length < MIN_DESC_LENGTH,
  );
  console.log(
    `[enrich] 전체 ${webtoons.length}편 중 설명 ${MIN_DESC_LENGTH}자 미만: ${needsEnrich.length}편`,
  );

  if (needsEnrich.length === 0) {
    console.log("[enrich] 보강할 작품 없음");
    return;
  }

  const enriched = await enrichBatch(needsEnrich);
  console.log(`[enrich] ${enriched.size}편 보강 완료`);

  // cleaned.json 업데이트: description에 키워드+줄거리 추가
  let updated = 0;
  for (const w of webtoons) {
    const data = enriched.get(w.id);
    if (!data) continue;

    const extra = [
      data.summary,
      `키워드: ${data.keywords.join(", ")}`,
    ].join("\n");

    w.description = w.description + "\n" + extra;
    updated++;
  }

  await writeFile(cleanedPath, JSON.stringify(webtoons, null, 2), "utf-8");
  console.log(`[enrich] ${updated}편 업데이트, cleaned.json 저장`);
  console.log("[enrich] 임베딩 재실행 필요: pnpm cli embed");
}
