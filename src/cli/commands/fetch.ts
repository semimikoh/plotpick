import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchWikiWebtoons } from "@/core/wiki/fetch";

export async function fetchCommand() {
  const webtoons = await fetchWikiWebtoons();

  const outPath = resolve(process.cwd(), "data/raw.json");
  await writeFile(outPath, JSON.stringify(webtoons, null, 2), "utf-8");

  console.log(`[fetch] ${outPath} 에 ${webtoons.length}편 저장`);
}
