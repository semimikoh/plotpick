import { NextResponse } from "next/server";
import { hybridSearch } from "@/core/search/hybrid";
import { z } from "zod";

const RequestSchema = z.object({
  query: z.string().trim().min(1, "query 필요").max(200, "200자 이내"),
  genres: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(20).optional().default(10),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청" }, { status: 400 });
  }

  const { query, genres, count } = parsed.data;

  try {
    const results = await hybridSearch(query, { count, genres });
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json({ error: "검색 오류" }, { status: 500 });
  }
}
