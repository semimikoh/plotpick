import "dotenv/config";
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

program.parse();
