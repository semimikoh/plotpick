import { NextResponse } from "next/server";
import { hybridSearch } from "@/core/search/hybrid";

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

  const { query, genres, count } = body as Record<string, unknown>;

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

  const safeGenres = Array.isArray(genres) ? genres : undefined;
  const safeCount = typeof count === "number" ? Math.min(count, 20) : 10;

  try {
    const results = await hybridSearch(query, {
      count: safeCount,
      genres: safeGenres,
    });
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json(
      { error: "검색 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
