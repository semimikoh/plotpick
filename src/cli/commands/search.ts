import { hybridSearch } from "@/core/search/hybrid";

export async function searchCommand(query: string) {
  console.log(`[search] "${query}" 하이브리드 검색 중...`);

  const results = await hybridSearch(query);

  if (results.length === 0) {
    console.log("[search] 결과 없음");
    return;
  }

  console.log(`[search] ${results.length}건\n`);

  for (const [i, r] of results.entries()) {
    const score = (r.similarity * 100).toFixed(1);
    const genres = r.genres.length > 0 ? ` [${r.genres.join(", ")}]` : "";
    console.log(`${i + 1}. ${r.title} (${score}%)${genres}`);
    console.log(`   ${r.platform} | ${r.url}`);
    console.log(`   ${r.description.slice(0, 80)}...`);
    console.log();
  }
}
