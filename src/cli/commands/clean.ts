import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RawWebtoon } from "@/core/wiki/fetch";
import {
  cleanWikiWebtoons,
  cleanKakaoCSV,
  cleanNaverCSV,
  mergeAll,
} from "@/core/data/clean";

async function tryReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

export async function cleanCommand() {
  const dataDir = resolve(process.cwd(), "data");
  const sources = [];

  // 1. 위키백과
  const rawJson = await tryReadFile(resolve(dataDir, "raw.json"));
  if (rawJson) {
    const rawData: RawWebtoon[] = JSON.parse(rawJson);
    const wiki = cleanWikiWebtoons(rawData);
    console.log(`[clean] 위키백과: ${wiki.length}편`);
    sources.push(wiki);
  }

  // 2. 카카오 CSV
  const kakaoCsv = await tryReadFile(resolve(dataDir, "kakao_raw.csv"));
  if (kakaoCsv) {
    const kakao = cleanKakaoCSV(kakaoCsv);
    console.log(`[clean] 카카오: ${kakao.length}편`);
    sources.push(kakao);
  }

  // 3. 네이버 CSV
  const naverCsv = await tryReadFile(resolve(dataDir, "naver_raw.csv"));
  if (naverCsv) {
    const naver = cleanNaverCSV(naverCsv);
    console.log(`[clean] 네이버: ${naver.length}편`);
    sources.push(naver);
  }

  // 통합 머지 (제목 중복 제거)
  const merged = mergeAll(sources);
  console.log(`[clean] 통합 후: ${merged.length}편 (중복 제거)`);

  // 플랫폼 통계
  const platforms: Record<string, number> = {};
  for (const w of merged) {
    platforms[w.platform] = (platforms[w.platform] || 0) + 1;
  }
  console.log("[clean] 플랫폼:", platforms);

  const outPath = resolve(dataDir, "cleaned.json");
  await writeFile(outPath, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`[clean] ${outPath} 저장 완료`);
}
