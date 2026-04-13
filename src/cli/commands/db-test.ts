import { getSupabase } from "@/core/db/supabase";

export async function dbTestCommand() {
  const { data, error } = await getSupabase()
    .from("webtoons")
    .select("id")
    .limit(1);

  if (error) {
    console.error("[db] 연결 실패:", error.message);
    process.exit(1);
  }

  console.log("[db] 연결 성공, webtoons 테이블 row:", data.length);
}
