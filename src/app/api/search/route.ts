import { NextResponse } from "next/server";
import { hybridSearch } from "@/core/search/hybrid";
import { inferGenres } from "@/core/llm/infer-genres";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 JSON 형식입니다." },
      { status: 400 },
    );
  }

  const { query, genres, count, autoGenre } = body as Record<string, unknown>;

  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "query 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  if (query.length > 200) {
    return NextResponse.json(
      { error: "검색어는 200자 이내로 입력해주세요." },
      { status: 400 },
    );
  }

  let safeGenres = Array.isArray(genres) ? (genres as string[]) : undefined;
  const safeCount = typeof count === "number" ? Math.min(count, 20) : 10;

  try {
    // LLM 장르 자동 추론 (유저 장르 없고 autoGenre가 true일 때)
    let inferredGenres: string[] = [];
    if (!safeGenres && autoGenre) {
      inferredGenres = await inferGenres(query);
      if (inferredGenres.length > 0) safeGenres = inferredGenres;
    }

    const results = await hybridSearch(query, {
      count: safeCount,
      genres: safeGenres,
    });

    return NextResponse.json({ results, inferredGenres });
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json(
      { error: "검색 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
