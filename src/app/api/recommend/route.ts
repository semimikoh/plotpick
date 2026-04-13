import { streamRecommendation } from "@/core/llm/recommend";
import { createTextStreamResponse } from "ai";
import type { SearchResult } from "@/core/search/vector";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 JSON 형식입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { query, results } = body as {
    query?: string;
    results?: SearchResult[];
  };

  if (!query || typeof query !== "string" || !Array.isArray(results)) {
    return new Response(
      JSON.stringify({ error: "query와 results가 필요합니다." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const stream = streamRecommendation(query, results);
    return createTextStreamResponse({ textStream: stream.textStream });
  } catch (err) {
    console.error("[api/recommend]", err);
    return new Response(
      JSON.stringify({ error: "추천 생성 중 오류가 발생했습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
