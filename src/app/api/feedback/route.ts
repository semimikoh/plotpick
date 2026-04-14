import { NextResponse } from "next/server";
import { getSupabase } from "@/core/db/supabase";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const { query, webtoonId } = body as Record<string, unknown>;

  if (!query || typeof query !== "string" || !webtoonId || typeof webtoonId !== "string") {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from("search_feedback")
    .insert({ query, webtoon_id: webtoonId });

  if (error) {
    console.error("[api/feedback]", error.message);
    return NextResponse.json({ error: "피드백 오류" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
