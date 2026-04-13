const API_BASE = "https://api.themoviedb.org/3";

function getToken(): string {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) throw new Error("TMDB_ACCESS_TOKEN 환경변수가 필요합니다.");
  return token;
}

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  original_language: string;
}

interface TMDBGenre {
  id: number;
  name: string;
}

export interface RawMovie {
  id: number;
  title: string;
  overview: string;
  releaseDate: string;
  genres: string[];
  rating: number;
  posterUrl: string | null;
  country: "kr" | "intl";
  cast?: string[];
  director?: string;
}

async function fetchGenreMap(): Promise<Map<number, string>> {
  const res = await fetch(`${API_BASE}/genre/movie/list?language=ko-KR`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  const map = new Map<number, string>();
  for (const g of data.genres as TMDBGenre[]) {
    map.set(g.id, g.name);
  }
  return map;
}

async function fetchMovies(
  genreMap: Map<number, string>,
  params: string,
  label: string,
  maxPages: number,
): Promise<RawMovie[]> {
  const movies: RawMovie[] = [];
  let page = 1;

  while (page <= maxPages) {
    const res = await fetch(
      `${API_BASE}/discover/movie?language=ko-KR&sort_by=popularity.desc&${params}&page=${page}`,
      { headers: { Authorization: `Bearer ${getToken()}` } },
    );

    if (!res.ok) {
      console.error(`[tmdb] ${label} page ${page} 실패: ${res.status}`);
      break;
    }

    const data = await res.json();
    const results: TMDBMovie[] = data.results;
    if (results.length === 0) break;

    for (const m of results) {
      if (!m.overview || m.overview.length < 10) continue;

      movies.push({
        id: m.id,
        title: m.title,
        overview: m.overview,
        releaseDate: m.release_date,
        genres: m.genre_ids.map((gid) => genreMap.get(gid) ?? "").filter(Boolean),
        rating: m.vote_average,
        posterUrl: m.poster_path
          ? `https://image.tmdb.org/t/p/w300${m.poster_path}`
          : null,
        country: m.original_language === "ko" ? "kr" : "intl",
      });
    }

    if (page % 10 === 0) {
      console.log(`[tmdb] ${label} ${page}/${maxPages} 페이지, ${movies.length}편`);
    }

    page++;
    await new Promise((r) => setTimeout(r, 50));
  }

  return movies;
}

export async function fetchAllMovies(options?: {
  krPages?: number;
  intlPages?: number;
}): Promise<RawMovie[]> {
  const krPages = options?.krPages ?? 200;
  const intlPages = options?.intlPages ?? 200;

  const genreMap = await fetchGenreMap();
  console.log(`[tmdb] 장르 ${genreMap.size}개 로드`);

  // 한국 영화: 평점 6+ 투표 100+
  console.log("[tmdb] 한국 영화 수집 중...");
  const krMovies = await fetchMovies(
    genreMap,
    "with_original_language=ko&vote_average.gte=6&vote_count.gte=100",
    "한국",
    krPages,
  );
  console.log(`[tmdb] 한국 영화: ${krMovies.length}편`);

  // 외국 영화: 평점 6+ 투표 100+ (한국어 번역 있는 것만)
  console.log("[tmdb] 외국 영화 수집 중...");
  const intlMovies = await fetchMovies(
    genreMap,
    "without_original_language=ko&vote_average.gte=6&vote_count.gte=500",
    "외국",
    intlPages,
  );
  console.log(`[tmdb] 외국 영화: ${intlMovies.length}편`);

  // 중복 제거
  const seen = new Set<number>();
  const all: RawMovie[] = [];
  for (const m of [...krMovies, ...intlMovies]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    all.push(m);
  }

  console.log(`[tmdb] 총 ${all.length}편 (중복 제거)`);
  return all;
}

// 배우/감독 정보 보강
async function fetchCredits(movieId: number): Promise<{ cast: string[]; director: string }> {
  const res = await fetch(
    `${API_BASE}/movie/${movieId}/credits?language=ko-KR`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );

  if (!res.ok) return { cast: [], director: "" };

  const data = await res.json();

  const cast = (data.cast ?? [])
    .slice(0, 5)
    .map((c: { name: string }) => c.name);

  const director = (data.crew ?? [])
    .find((c: { job: string }) => c.job === "Director")?.name ?? "";

  return { cast, director };
}

export async function enrichMoviesWithCredits(movies: RawMovie[]): Promise<RawMovie[]> {
  console.log(`[tmdb] ${movies.length}편 배우/감독 정보 수집 중...`);

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    const { cast, director } = await fetchCredits(m.id);
    m.cast = cast;
    m.director = director;

    if ((i + 1) % 100 === 0) {
      console.log(`[tmdb] credits ${i + 1}/${movies.length}`);
    }

    await new Promise((r) => setTimeout(r, 25));
  }

  console.log("[tmdb] credits 수집 완료");
  return movies;
}
