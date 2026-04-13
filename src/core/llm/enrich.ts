import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { CleanedWebtoon } from "@/core/data/clean";

const schema = z.object({
  keywords: z.array(z.string()).describe("검색에 도움될 키워드 5~10개"),
  summary: z.string().describe("작품 추정 줄거리 1~2줄"),
});

export async function enrichWebtoon(
  webtoon: CleanedWebtoon,
): Promise<{ keywords: string[]; summary: string }> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `웹툰 제목과 기존 정보를 보고 검색에 도움될 키워드와 줄거리를 생성하세요.

제목: ${webtoon.title}
플랫폼: ${webtoon.platform}
장르: ${webtoon.genres.join(", ") || "미분류"}
기존 설명: ${webtoon.description}

규칙:
- 키워드: 이 작품을 찾을 때 사용할 법한 단어들 (장르, 분위기, 소재, 캐릭터 유형 등)
- 줄거리: 제목과 장르에서 추정 가능한 내용 1~2줄. 확실하지 않으면 "제목 기반 추정:" 접두사 붙이기
- 한국어로 작성`,
  });

  return object;
}

export async function enrichBatch(
  webtoons: CleanedWebtoon[],
  batchSize = 5,
): Promise<Map<string, { keywords: string[]; summary: string }>> {
  const results = new Map<string, { keywords: string[]; summary: string }>();

  for (let i = 0; i < webtoons.length; i += batchSize) {
    const batch = webtoons.slice(i, i + batchSize);
    const promises = batch.map(async (w) => {
      try {
        const enriched = await enrichWebtoon(w);
        results.set(w.id, enriched);
      } catch (err) {
        console.error(`[enrich] ${w.title} 실패:`, err);
      }
    });

    await Promise.all(promises);
    console.log(`[enrich] ${Math.min(i + batchSize, webtoons.length)}/${webtoons.length}`);
  }

  return results;
}
