const WIKI_API = "https://ko.wikipedia.org/w/api.php";
const USER_AGENT = "PlotPick/0.1 (ejffjeosms@gmail.com)";

const CATEGORIES = [
  "분류:한국의_웹툰",
  "분류:네이버_웹툰",
  "분류:다음_웹툰",
  "분류:레진코믹스",
  "분류:카카오페이지의_웹툰",
];

interface WikiPage {
  pageid: number;
  title: string;
}

interface WikiExtract {
  pageid: number;
  title: string;
  extract: string;
  fullurl: string;
  categories?: Array<{ title: string }>;
}

export interface RawWebtoon {
  pageid: number;
  title: string;
  extract: string;
  url: string;
  categories: string[];
  source: "wikipedia";
}

async function wikiRequest(params: Record<string, string>): Promise<unknown> {
  const url = new URL(WIKI_API);
  url.search = new URLSearchParams({
    format: "json",
    origin: "*",
    ...params,
  }).toString();

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Wiki API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

async function fetchCategoryMembers(category: string): Promise<WikiPage[]> {
  const pages: WikiPage[] = [];
  let cmcontinue: string | undefined;

  do {
    const params: Record<string, string> = {
      action: "query",
      list: "categorymembers",
      cmtitle: category,
      cmtype: "page",
      cmlimit: "500",
    };
    if (cmcontinue) {
      params.cmcontinue = cmcontinue;
    }

    const data = (await wikiRequest(params)) as {
      query: { categorymembers: WikiPage[] };
      continue?: { cmcontinue: string };
    };

    pages.push(...data.query.categorymembers);
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);

  return pages;
}

async function fetchExtracts(pageIds: number[]): Promise<WikiExtract[]> {
  const results: WikiExtract[] = [];

  // MediaWiki API는 한 번에 최대 50개
  for (let i = 0; i < pageIds.length; i += 50) {
    const batch = pageIds.slice(i, i + 50);
    const data = (await wikiRequest({
      action: "query",
      pageids: batch.join("|"),
      prop: "extracts|info|categories",
      exintro: "true",
      explaintext: "true",
      inprop: "url",
      cllimit: "50",
    })) as {
      query: {
        pages: Record<
          string,
          {
            pageid: number;
            title: string;
            extract?: string;
            fullurl?: string;
            categories?: Array<{ title: string }>;
          }
        >;
      };
    };

    for (const page of Object.values(data.query.pages)) {
      if (page.extract && page.fullurl) {
        results.push({
          pageid: page.pageid,
          title: page.title,
          extract: page.extract,
          fullurl: page.fullurl,
          categories: page.categories,
        });
      }
    }

    // 예의 바르게 100ms 딜레이
    if (i + 50 < pageIds.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return results;
}

export async function fetchWikiWebtoons(): Promise<RawWebtoon[]> {
  console.log("[fetch] 위키백과 카테고리에서 웹툰 목록 수집 중...");

  // 1. 모든 카테고리에서 페이지 목록 수집
  const allPages = new Map<number, WikiPage>();

  for (const category of CATEGORIES) {
    console.log(`  → ${category}`);
    const pages = await fetchCategoryMembers(category);
    for (const page of pages) {
      allPages.set(page.pageid, page);
    }
  }

  console.log(`  총 ${allPages.size}개 고유 문서 발견`);

  // 2. 각 문서의 도입부 텍스트 수집
  console.log("[fetch] 도입부 텍스트 수집 중...");
  const pageIds = [...allPages.keys()];
  const extracts = await fetchExtracts(pageIds);

  // 3. RawWebtoon으로 변환
  const webtoons: RawWebtoon[] = extracts
    .filter((e) => e.extract.length > 30) // 너무 짧은 건 제외
    .map((e) => ({
      pageid: e.pageid,
      title: e.title,
      extract: e.extract,
      url: e.fullurl,
      categories: (e.categories ?? []).map((c) => c.title),
      source: "wikipedia" as const,
    }));

  console.log(`[fetch] ${webtoons.length}편 수집 완료 (30자 미만 제외)`);
  return webtoons;
}
