import type { RawWebtoon } from "@/core/wiki/fetch";

export interface CleanedWebtoon {
  id: string;
  title: string;
  description: string;
  url: string;
  genres: string[];
  platform: string;
  source: "wikipedia" | "kakao-dataset" | "naver-dataset" | "curation";
}

// --- 위키 정제 ---

const PLATFORM_CATEGORIES: Record<string, string> = {
  "분류:네이버 웹툰": "naver",
  "분류:완결된 네이버 웹툰": "naver",
  "분류:다음 웹툰": "daum",
  "분류:레진코믹스": "lezhin",
  "분류:카카오페이지의 웹툰": "kakaopage",
};

const GENRE_KEYWORDS = [
  "코미디", "로맨스", "판타지", "액션", "스릴러", "공포",
  "무협", "SF", "일상", "드라마", "학원", "스포츠",
  "미스터리", "고등학교", "역사", "블랙 코미디",
];

const IGNORE_PATTERNS = [
  "토막글", "출처", "위키데이터", "웹아카이브",
  "영어 표기", "모든 ", "정리가 필요", "전체에 ",
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

function cleanText(text: string): string {
  return text.replace(/\n{2,}/g, "\n").replace(/\s{2,}/g, " ").trim();
}

export function cleanWikiWebtoons(rawWebtoons: RawWebtoon[]): CleanedWebtoon[] {
  const seen = new Set<string>();
  return rawWebtoons
    .filter((raw) => {
      if (seen.has(String(raw.pageid))) return false;
      seen.add(String(raw.pageid));
      if (raw.extract.length < 50) return false;
      return true;
    })
    .map((raw) => ({
      id: `wiki-${raw.pageid}`,
      title: raw.title.replace(/\s*\(만화\)$/, "").replace(/\s*\(웹툰\)$/, ""),
      description: cleanText(raw.extract),
      url: raw.url,
      genres: extractGenres(raw.categories),
      platform: extractPlatform(raw.categories),
      source: "wikipedia" as const,
    }));
}

// --- 카카오 CSV 정제 ---

export function cleanKakaoCSV(csvContent: string): CleanedWebtoon[] {
  const lines = csvContent.split("\n");
  // 첫 줄은 헤더: ,id,url,title,genre,img,desc,key_word,desc_noun
  const results: CleanedWebtoon[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV 파싱 (쉼표 안의 따옴표 처리)
    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;

    const id = fields[1];
    const url = fields[2];
    const title = fields[3];
    const genre = fields[4];
    const desc = fields[6];

    if (!title || !desc || desc.length < 10) continue;

    results.push({
      id: `kakao-${id}`,
      title: title.trim(),
      description: cleanText(desc),
      url: url || `https://webtoon.kakao.com/content/${encodeURIComponent(title)}/${id}`,
      genres: genre ? genre.split("/").map((g) => g.trim()) : [],
      platform: "kakao",
      source: "kakao-dataset",
    });
  }

  return results;
}

// --- 네이버 CSV 정제 ---

export function cleanNaverCSV(csvContent: string): CleanedWebtoon[] {
  const lines = csvContent.split("\n");
  const results: CleanedWebtoon[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 3) continue;

    const title = fields[0].replace(/^\uFEFF/, ""); // BOM 제거
    const descRaw = fields[1] || "";
    const url = fields[2] || "";

    // 설명에서 장르/등급 분리: "설명 , 장르1, 장르2 등급"
    const parts = descRaw.split(/\s*,\s{2,}/);
    const description = (parts[0] || "").trim();
    const genrePart = (parts[1] || "").trim();

    // 장르 추출 (등급 제거)
    const genres = genrePart
      .replace(/\d+세\s*이용가|전체\s*이용가/g, "")
      .split(/[,\s]+/)
      .map((g) => g.trim())
      .filter((g) => g.length > 0 && g !== "스토리" && g !== "에피소드" && g !== "옴니버스");

    if (!title || description.length < 10) continue;

    // URL에서 titleId 추출
    const idMatch = url.match(/titleId=(\d+)/);
    const id = idMatch ? idMatch[1] : String(i);

    results.push({
      id: `naver-${id}`,
      title: title.trim(),
      description: cleanText(description),
      url: url || "",
      genres,
      platform: "naver",
      source: "naver-dataset",
    });
  }

  return results;
}

// --- CSV 파싱 유틸 ---

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// --- 통합 머지 ---

export function mergeAll(sources: CleanedWebtoon[][]): CleanedWebtoon[] {
  const seen = new Set<string>();
  const results: CleanedWebtoon[] = [];

  for (const source of sources) {
    for (const w of source) {
      // 제목 기준 중복 제거 (정규화)
      const key = w.title.replace(/\s/g, "").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(w);
    }
  }

  return results;
}
