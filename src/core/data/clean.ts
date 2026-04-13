import type { RawWebtoon } from "@/core/wiki/fetch";

export interface CleanedWebtoon {
  id: string;
  title: string;
  description: string;
  url: string;
  genres: string[];
  platform: string;
  source: "wikipedia" | "curation";
}

// 위키 카테고리 → 플랫폼 매핑
const PLATFORM_CATEGORIES: Record<string, string> = {
  "분류:네이버 웹툰": "naver",
  "분류:완결된 네이버 웹툰": "naver",
  "분류:다음 웹툰": "daum",
  "분류:레진코믹스": "lezhin",
  "분류:카카오페이지의 웹툰": "kakaopage",
};

// 장르로 쓸 수 있는 카테고리 키워드
const GENRE_KEYWORDS = [
  "코미디",
  "로맨스",
  "판타지",
  "액션",
  "스릴러",
  "공포",
  "무협",
  "SF",
  "일상",
  "드라마",
  "학원",
  "스포츠",
  "미스터리",
  "고등학교",
  "역사",
  "블랙 코미디",
];

// 무시할 메타 카테고리 패턴
const IGNORE_PATTERNS = [
  "토막글",
  "출처",
  "위키데이터",
  "웹아카이브",
  "영어 표기",
  "모든 ",
  "정리가 필요",
  "전체에 ",
];

function extractPlatform(categories: string[]): string {
  for (const cat of categories) {
    const platform = PLATFORM_CATEGORIES[cat];
    if (platform) return platform;
  }
  return "unknown";
}

function extractGenres(categories: string[]): string[] {
  return categories
    .filter((cat) => {
      if (IGNORE_PATTERNS.some((p) => cat.includes(p))) return false;
      if (PLATFORM_CATEGORIES[cat]) return false;
      if (cat === "분류:대한민국의 만화") return false;
      if (cat === "분류:한국의 웹툰") return false;
      return GENRE_KEYWORDS.some((g) => cat.includes(g));
    })
    .map((cat) => cat.replace("분류:", "").trim());
}

function cleanExtract(extract: string): string {
  return extract
    .replace(/\n{2,}/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanWebtoons(rawWebtoons: RawWebtoon[]): CleanedWebtoon[] {
  const seen = new Set<string>();

  return rawWebtoons
    .filter((raw) => {
      // 중복 제거 (pageid 기준)
      if (seen.has(String(raw.pageid))) return false;
      seen.add(String(raw.pageid));

      // 너무 짧은 설명 제외
      if (raw.extract.length < 50) return false;

      return true;
    })
    .map((raw) => ({
      id: `wiki-${raw.pageid}`,
      title: raw.title.replace(/\s*\(만화\)$/, "").replace(/\s*\(웹툰\)$/, ""),
      description: cleanExtract(raw.extract),
      url: raw.url,
      genres: extractGenres(raw.categories),
      platform: extractPlatform(raw.categories),
      source: "wikipedia" as const,
    }));
}

export function mergeCuration(
  cleaned: CleanedWebtoon[],
  curation: CleanedWebtoon[],
): CleanedWebtoon[] {
  const existingTitles = new Set(cleaned.map((w) => w.title));

  const newItems = curation.filter((c) => !existingTitles.has(c.title));
  console.log(
    `[clean] 큐레이션 ${curation.length}편 중 ${newItems.length}편 신규 추가`,
  );

  return [...cleaned, ...newItems];
}
