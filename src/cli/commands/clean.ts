import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RawWebtoon } from "@/core/wiki/fetch";
import type { CleanedWebtoon } from "@/core/data/clean";
import { cleanWebtoons, mergeCuration } from "@/core/data/clean";

export async function cleanCommand() {
  const rawPath = resolve(process.cwd(), "data/raw.json");
  const rawData: RawWebtoon[] = JSON.parse(await readFile(rawPath, "utf-8"));
  console.log(`[clean] raw.json: ${rawData.length}편 로드`);

  let cleaned = cleanWebtoons(rawData);
  console.log(`[clean] 정제 후: ${cleaned.length}편`);

  // 큐레이션 파일이 있으면 머지
  const curationPath = resolve(process.cwd(), "data/curation.json");
  try {
    const curationData: CleanedWebtoon[] = JSON.parse(
      await readFile(curationPath, "utf-8"),
    );
    cleaned = mergeCuration(cleaned, curationData);
  } catch {
    console.log("[clean] curation.json 없음, 스킵");
  }

  const outPath = resolve(process.cwd(), "data/cleaned.json");
  await writeFile(outPath, JSON.stringify(cleaned, null, 2), "utf-8");
  console.log(`[clean] ${outPath} 에 ${cleaned.length}편 저장`);

  // 통계
  const platforms: Record<string, number> = {};
  const genreCount: Record<string, number> = {};
  for (const w of cleaned) {
    platforms[w.platform] = (platforms[w.platform] || 0) + 1;
    for (const g of w.genres) {
      genreCount[g] = (genreCount[g] || 0) + 1;
    }
  }
  console.log("[clean] 플랫폼:", platforms);
  console.log("[clean] 장르:", genreCount);
}
