import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const MOVIE_GENRES = [
  "액션", "모험", "애니메이션", "코미디", "범죄", "다큐멘터리",
  "드라마", "가족", "판타지", "역사", "공포", "음악",
  "미스터리", "로맨스", "SF", "TV 영화", "스릴러", "전쟁", "서부",
];

const schema = z.object({
  genres: z.array(z.string()).describe("추론된 장르 목록 (빈 배열이면 필터 없음)"),
});

export async function inferMovieGenres(query: string): Promise<string[]> {
  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema,
      prompt: `사용자가 영화를 찾고 있습니다. 검색어에서 장르를 추론하세요.

사용 가능한 장르: ${MOVIE_GENRES.join(", ")}

규칙:
- 검색어가 명시적으로 장르를 언급할 때만 반환 (예: "스릴러 영화", "코미디 추천")
- 줄거리 묘사나 장면 설명이면 빈 배열 반환 (장르를 추측하지 말 것)
- 확실하지 않으면 빈 배열 반환 (필터 없이 전체 검색)
- 최대 2개까지만
- 배우 이름이나 감독 이름이 포함되면 빈 배열 반환
- "가족이 여행", "아이가 유괴" 같은 줄거리 묘사는 장르 추론 금지 → 빈 배열

검색어: "${query}"`,
    });

    return object.genres.filter((g) => MOVIE_GENRES.includes(g));
  } catch (err) {
    console.error("[infer-movie-genres]", err);
    return [];
  }
}
