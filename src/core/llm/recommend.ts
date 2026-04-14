import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ContentResult } from "@/core/types/search";

export function buildContext(results: ContentResult[]): string {
  return results
    .map((r, i) => {
      const genres = r.genres.length > 0 ? ` (${r.genres.join(", ")})` : "";
      return `[${i + 1}] ${r.title}${genres}\n${r.description}`;
    })
    .join("\n\n");
}

export function streamRecommendation(query: string, results: ContentResult[], media: "webtoon" | "movie" = "movie") {
  const context = buildContext(results);
  const isSingleResult = results.length === 1;
  const label = media === "movie" ? "영화" : "웹툰";

  const system = isSingleResult
    ? `사용자가 찾던 ${label}을 선택했습니다. 해당 작품에 대해 반갑게 알려주세요.

규칙:
- 사용자의 검색어와 이 작품이 어떻게 연결되는지 한 줄로 설명
- 작품의 매력 포인트를 간단히 소개
- 마크다운 형식 (제목은 **볼드**)
- 간결하게, 200자 이내
- 톤: 친근하고 반가운`
    : `당신은 ${label} 검색 도우미입니다. 사용자가 흐릿하게 기억하는 ${label}를 찾아주거나, 원하는 분위기의 ${label}를 알려주세요.

규칙:
- 검색 결과에 있는 작품만 언급. 없는 작품을 지어내지 마세요.
- 사용자가 기억을 더듬는 질문이면 → "혹시 이 작품 아닌가요?" 톤
- 사용자가 추천 요청이면 → "이런 작품들이 있어요" 톤
- 사용자가 "~아닌", "~말고" 같은 부정어를 쓰면 해당 장르/분위기 작품은 제외하고 답변
- 각 작품이 왜 사용자의 설명에 맞는지 한 줄로 연결
- 검색 결과 중 사용자 설명에 안 맞는 작품은 건너뛰어도 됨
- 마크다운 형식 (제목은 **볼드**)
- 간결하게, 300자 이내`;

  const prompt = isSingleResult
    ? `사용자 검색어: "${query}"
선택한 작품:
${context}

이 작품을 찾은 사용자에게 반갑게 알려주세요.`
    : `사용자: "${query}"

검색 결과:
${context}

사용자가 찾고 있는 ${label}를 골라서 알려주세요.`;

  return streamText({
    model: openai("gpt-4o-mini"),
    system,
    prompt,
  });
}
