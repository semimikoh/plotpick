import { streamRecommendation } from "@/core/llm/recommend";
import { createTextStreamResponse } from "ai";
import type { SearchResult } from "@/core/search/vector";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { query, results, media } = body as {
    query?: string;
    results?: SearchResult[];
    media?: "webtoon" | "movie";
  };

  if (!query || typeof query !== "string" || !Array.isArray(results)) {
    return new Response(
      JSON.stringify({ error: "잘못된 요청" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const stream = streamRecommendation(query, results, media ?? "movie");
    return createTextStreamResponse({ textStream: stream.textStream });
  } catch (err) {
    console.error("[api/recommend]", err);
    return new Response(
      JSON.stringify({ error: "추천 오류" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
