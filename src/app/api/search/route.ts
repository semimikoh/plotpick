import { NextResponse } from "next/server";
import { hybridSearch } from "@/core/search/hybrid";

export async function POST(request: Request) {
  const body = await request.json();
  const query = body.query;

  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "query 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const genres = Array.isArray(body.genres) ? body.genres : undefined;
  const count = typeof body.count === "number" ? body.count : 10;

  const results = await hybridSearch(query, { count, genres });

  return NextResponse.json({ results });
}
