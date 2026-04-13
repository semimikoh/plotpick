const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const API_BASE = "https://comic.naver.com/api";

interface NaverTitle {
  titleId: number;
  titleName: string;
  author: string;
  adult: boolean;
  finish: boolean;
}

export interface NaverWebtoon {
  titleId: number;
  title: string;
  author: string;
  description: string;
  url: string;
  genres: string[];
  finished: boolean;
}

async function fetchWeekdayTitles(): Promise<NaverTitle[]> {
  const res = await fetch(`${API_BASE}/webtoon/titlelist/weekday`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`weekday API ${res.status}`);
  const data = await res.json();

  const titles: NaverTitle[] = [];
  for (const list of Object.values(data.titleListMap) as NaverTitle[][]) {
    for (const t of list) {
      titles.push(t);
    }
  }
  return titles;
}

async function fetchFinishedTitles(): Promise<NaverTitle[]> {
  const titles: NaverTitle[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `${API_BASE}/webtoon/titlelist/finish?order=user&page=${page}`,
      { headers: { "User-Agent": USER_AGENT } },
    );

    if (!res.ok) break;

    const data = await res.json();
    if (!data.titleList || data.titleList.length === 0) break;

    titles.push(...data.titleList);
    page++;

    await new Promise((r) => setTimeout(r, 100));
  }

  return titles;
}

async function fetchDescription(titleId: number): Promise<{ description: string; genres: string[] }> {
  const url = `https://comic.naver.com/webtoon/list?titleId=${titleId}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) return { description: "", genres: [] };

  const html = await res.text();

  // og:description에서 줄거리 추출
  const descMatch = html.match(/property="og:description"\s+content="([^"]+)"/);
  const description = descMatch
    ? descMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .trim()
    : "";

  // 장르 추출: og:genre 또는 EpisodeListInfo__genre 등
  const genreMatches = html.match(/genre[^"]*"[^"]*content="([^"]+)"/i);
  const genres = genreMatches
    ? genreMatches[1].split(",").map((g: string) => g.trim()).filter(Boolean)
    : [];

  return { description, genres };
}

export async function fetchNaverWebtoons(options?: {
  includeFinished?: boolean;
  maxFinishedPages?: number;
}): Promise<NaverWebtoon[]> {
  const includeFinished = options?.includeFinished ?? false;

  // 1. 연재작 목록
  console.log("[naver] 연재작 목록 가져오는 중...");
  const weekday = await fetchWeekdayTitles();
  console.log(`[naver] 연재작: ${weekday.length}편`);

  // 2. 완결작 (선택)
  let finished: NaverTitle[] = [];
  if (includeFinished) {
    console.log("[naver] 완결작 목록 가져오는 중...");
    finished = await fetchFinishedTitles();
    console.log(`[naver] 완결작: ${finished.length}편`);
  }

  // 중복 제거
  const allTitles = new Map<number, NaverTitle>();
  for (const t of [...weekday, ...finished]) {
    if (!t.adult) allTitles.set(t.titleId, t);
  }
  console.log(`[naver] 성인 제외, 고유: ${allTitles.size}편`);

  // 3. 각 작품 상세 (og:description)
  console.log("[naver] 줄거리 수집 중...");
  const results: NaverWebtoon[] = [];
  const ids = [...allTitles.values()];

  for (let i = 0; i < ids.length; i++) {
    const t = ids[i];
    const { description, genres } = await fetchDescription(t.titleId);

    if (description.length >= 10) {
      results.push({
        titleId: t.titleId,
        title: t.titleName,
        author: t.author,
        description,
        url: `https://comic.naver.com/webtoon/list?titleId=${t.titleId}`,
        genres,
        finished: t.finish,
      });
    }

    // 진행 상황 + 예의 바른 딜레이
    if ((i + 1) % 50 === 0) {
      console.log(`[naver] ${i + 1}/${ids.length} 처리`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`[naver] ${results.length}편 수집 완료`);
  return results;
}
