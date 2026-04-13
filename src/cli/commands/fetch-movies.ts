import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchAllMovies, enrichMoviesWithCredits } from "@/core/tmdb/fetch";

export async function fetchMoviesCommand() {
  let movies = await fetchAllMovies({ krPages: 200, intlPages: 200 });

  // 배우/감독 정보 보강
  movies = await enrichMoviesWithCredits(movies);

  const outPath = resolve(process.cwd(), "data/movies_raw.json");
  await writeFile(outPath, JSON.stringify(movies, null, 2), "utf-8");
  console.log(`[fetch-movies] ${outPath} 에 ${movies.length}편 저장`);
}
