import { config } from "dotenv";
config({ path: ".env.local" });
import { Command } from "commander";

const program = new Command();

program
  .name("plotpick")
  .description("PlotPick CLI — 웹툰 데이터 파이프라인")
  .version("0.1.0");

program
  .command("fetch")
  .description("위키백과에서 한국 웹툰 데이터 수집")
  .action(async () => {
    const { fetchCommand } = await import("@/cli/commands/fetch");
    await fetchCommand();
  });

program
  .command("clean")
  .description("raw.json 정제 + 큐레이션 머지 → cleaned.json")
  .action(async () => {
    const { cleanCommand } = await import("@/cli/commands/clean");
    await cleanCommand();
  });

program
  .command("db-test")
  .description("Supabase 연결 테스트")
  .action(async () => {
    const { dbTestCommand } = await import("@/cli/commands/db-test");
    await dbTestCommand();
  });

program
  .command("embed")
  .description("cleaned.json 임베딩 + Supabase 적재")
  .action(async () => {
    const { embedCommand } = await import("@/cli/commands/embed");
    await embedCommand();
  });

program
  .command("fetch-naver")
  .description("네이버웹툰 현재 연재작 수집")
  .action(async () => {
    const { fetchNaverCommand } = await import("@/cli/commands/fetch-naver");
    await fetchNaverCommand();
  });

program
  .command("search <query>")
  .description("웹툰 의미 검색")
  .option("-g, --genre <genres>", "장르 필터 (쉼표 구분, 예: 공포,스릴러)")
  .action(async (query: string, opts: { genre?: string }) => {
    const { searchCommand } = await import("@/cli/commands/search");
    await searchCommand(query, opts.genre);
  });

program.parse();
