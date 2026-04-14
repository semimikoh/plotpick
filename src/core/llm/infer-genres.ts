import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const AVAILABLE_GENRES = [
  "로맨스", "코미디", "액션", "무협", "판타지", "공포", "스릴러",
  "드라마", "일상", "스포츠", "SF", "미스터리", "학원", "역사",
];

const schema = z.object({
  genres: z.array(z.string()).describe("추론된 장르 목록 (빈 배열이면 필터 없음)"),
});

export async function inferGenres(query: string): Promise<string[]> {
  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema,
      prompt: `사용자가 웹툰을 찾고 있습니다. 사용자의 검색어에서 장르를 추론하세요.

사용 가능한 장르: ${AVAILABLE_GENRES.join(", ")}

규칙:
- 검색어가 명시적으로 장르를 언급할 때만 반환 (예: "스릴러 웹툰", "로맨스 추천", "힐링물")
- 줄거리 묘사나 장면 설명이면 빈 배열 반환 (장르를 추측하지 말 것)
- 확실하지 않으면 빈 배열 반환 (필터 없이 전체 검색)
- 최대 2개까지만
- "힐링", "따뜻한" → 일상
- "무서운", "소름" → 공포, 스릴러
- "회귀", "전생", "환생" → 판타지
- "싸움", "격투" → 액션
- "연애", "설렘" → 로맨스
- "학교에서 ~한 일" 같은 줄거리 묘사는 장르 추론 금지 → 빈 배열

검색어: "${query}"`,
    });

    return object.genres.filter((g) => AVAILABLE_GENRES.includes(g));
  } catch (err) {
    console.error("[infer-genres]", err);
    return [];
  }
}
