import { NextResponse } from "next/server";
import { hybridMovieSearch } from "@/core/search/movie-hybrid";
import { inferMovieGenres } from "@/core/llm/infer-movie-genres";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const { query, genres, count, autoGenre } = body as Record<string, unknown>;

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query 필요" }, { status: 400 });
  }

  if (query.length > 200) {
    return NextResponse.json({ error: "200자 이내" }, { status: 400 });
  }

  let safeGenres = Array.isArray(genres) ? (genres as string[]) : undefined;
  const safeCount = typeof count === "number" ? Math.min(count, 20) : 10;

  try {
    let inferredGenres: string[] = [];
    if (!safeGenres && autoGenre) {
      inferredGenres = await inferMovieGenres(query);
      if (inferredGenres.length > 0) safeGenres = inferredGenres;
    }

    const results = await hybridMovieSearch(query, {
      count: safeCount,
      genres: safeGenres,
    });

    return NextResponse.json({ results, inferredGenres });
  } catch (err) {
    console.error("[api/search-movies]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "검색 오류", detail: msg }, { status: 500 });
  }
}
