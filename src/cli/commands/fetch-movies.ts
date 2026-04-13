import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchAllMovies } from "@/core/tmdb/fetch";

export async function fetchMoviesCommand() {
  const movies = await fetchAllMovies({ krPages: 200, intlPages: 200 });

  const outPath = resolve(process.cwd(), "data/movies_raw.json");
  await writeFile(outPath, JSON.stringify(movies, null, 2), "utf-8");
  console.log(`[fetch-movies] ${outPath} 에 ${movies.length}편 저장`);
}
