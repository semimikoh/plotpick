import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchNaverWebtoons } from "@/core/naver/fetch";

export async function fetchNaverCommand() {
  const webtoons = await fetchNaverWebtoons({ includeFinished: true });

  const outPath = resolve(process.cwd(), "data/naver_live.json");
  await writeFile(outPath, JSON.stringify(webtoons, null, 2), "utf-8");
  console.log(`[fetch-naver] ${outPath} 에 ${webtoons.length}편 저장`);
}
