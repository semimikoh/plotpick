import {
  type FontDescriptor,
  type MeasureCache,
  defaultCache,
} from "./cache";
import {
  DEFAULT_FONT,
  BOLD_FONT,
  HEADING_FONTS,
  buildCumulativeWidths,
  measureTextWidth,
} from "./measure";
// 채팅 컴포넌트 타입에 직접 의존하지 않고 필요한 필드만 정의
interface MessageLike {
  role: "user" | "assistant";
  content: string;
  genreOptions?: string[];
  results?: { id: string }[];
}

// --- 타입 ---

export interface PreparedLayout {
  lines: number;
  height: number;
  lineBreaks: number[];
}

export interface LayoutParams {
  containerWidth: number;
  font: FontDescriptor;
  lineHeight: number;
  paddingX: number;
  paddingY: number;
}

// --- 줄바꿈 판정 (띄어쓰기 기준) ---

function isBreakable(text: string, index: number): boolean {
  if (index <= 0 || index >= text.length) return false;
  // 공백/줄바꿈 위치에서만 줄바꿈 (한글도 띄어쓰기 기준)
  const code = text.charCodeAt(index);
  if (code === 0x20 || code === 0x0a) return true;
  // 이전 문자가 공백이면 그 다음에서 줄바꿈
  const prev = text.charCodeAt(index - 1);
  if (prev === 0x20 || prev === 0x0a) return true;
  return false;
}

// --- 핵심: 이진탐색 줄바꿈 ---

export function prepareTextLayout(
  text: string,
  params: LayoutParams,
  cache: MeasureCache = defaultCache,
): PreparedLayout {
  if (!text || text.length === 0) {
    return { lines: 0, height: 0, lineBreaks: [] };
  }

  const availableWidth = params.containerWidth - params.paddingX;
  if (availableWidth <= 0) {
    return { lines: 1, height: params.font.size * params.lineHeight, lineBreaks: [] };
  }

  const cumWidths = buildCumulativeWidths(text, params.font, cache);
  const lineBreaks: number[] = [];
  let lineStart = 0;

  while (lineStart < text.length) {
    // 남은 텍스트가 한 줄에 들어가면 끝
    const remainingWidth = cumWidths[text.length] - cumWidths[lineStart];
    if (remainingWidth <= availableWidth) {
      break;
    }

    // 이진탐색: lineStart부터 availableWidth 안에 들어가는 최대 인덱스
    let lo = lineStart + 1;
    let hi = text.length;

    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      const lineWidth = cumWidths[mid] - cumWidths[lineStart];
      if (lineWidth <= availableWidth) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    // lo = 폭 제한 내 최대 인덱스. 여기서 줄바꿈 지점 찾기
    let breakAt = lo;

    // 줄바꿈 가능한 위치로 후퇴
    let candidate = breakAt;
    while (candidate > lineStart && !isBreakable(text, candidate)) {
      candidate--;
    }

    // 줄바꿈 가능한 위치를 못 찾으면 강제 줄바꿈 (긴 단어)
    if (candidate <= lineStart) {
      breakAt = Math.max(lineStart + 1, lo);
    } else {
      breakAt = candidate;
    }

    lineBreaks.push(breakAt);
    lineStart = breakAt;

    // 줄바꿈 후 공백 건너뛰기
    while (lineStart < text.length && text[lineStart] === " ") {
      lineStart++;
    }
  }

  const lines = lineBreaks.length + 1;
  const lineHeightPx = params.font.size * params.lineHeight;
  const height = lines * lineHeightPx + params.paddingY;

  return { lines, height, lineBreaks };
}

// --- 마크다운 파싱 (간이) ---

interface TextSegment {
  text: string;
  font: FontDescriptor;
  blockSpacing: number; // 블록 요소 간 여백 (px)
}

function parseMarkdownSegments(markdown: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // 빈 줄 = 단락 간격
      segments.push({ text: "", font: DEFAULT_FONT, blockSpacing: 8 });
      continue;
    }

    // 헤딩
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const font = HEADING_FONTS[level] ?? HEADING_FONTS[6];
      segments.push({ text: headingMatch[2], font, blockSpacing: 12 });
      continue;
    }

    // 코드 블록 (단순화: 인라인 코드만)
    // 일반 텍스트 (볼드/이탤릭 마크다운 기호 제거)
    const cleaned = trimmed
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1");

    // 볼드 포함 여부로 폰트 결정
    const hasBold = /\*\*/.test(trimmed);
    segments.push({
      text: cleaned,
      font: hasBold ? BOLD_FONT : DEFAULT_FONT,
      blockSpacing: 4,
    });
  }

  return segments;
}

export function prepareMarkdownLayout(
  markdown: string,
  params: LayoutParams,
  cache: MeasureCache = defaultCache,
): PreparedLayout {
  const segments = parseMarkdownSegments(markdown);
  let totalHeight = params.paddingY;
  let totalLines = 0;
  const allBreaks: number[] = [];

  for (const seg of segments) {
    if (!seg.text) {
      totalHeight += seg.blockSpacing;
      continue;
    }

    const segParams = { ...params, font: seg.font, paddingY: 0 };
    const layout = prepareTextLayout(seg.text, segParams, cache);
    totalHeight += layout.height + seg.blockSpacing;
    totalLines += layout.lines;
    allBreaks.push(...layout.lineBreaks);
  }

  return { lines: totalLines, height: totalHeight, lineBreaks: allBreaks };
}

// --- 복합 메시지 높이 추정 ---

// Paper p="sm" = 12px * 2, Box mb="sm" = 12px
const PAPER_PADDING_Y = 24;
const PAPER_PADDING_X = 24;
const DEFAULT_LINE_HEIGHT = 1.55;
const CARD_HEIGHT = 130;
const CARD_GAP = 12;
const GENRE_BUTTON_HEIGHT = 30;
const GENRE_BUTTON_GAP = 8;

export function estimateMessageHeight(
  message: MessageLike,
  containerWidth: number,
  cache: MeasureCache = defaultCache,
): number {
  const isUser = message.role === "user";
  const msgWidth = isUser ? containerWidth * 0.8 : containerWidth;

  const params: LayoutParams = {
    containerWidth: msgWidth,
    font: DEFAULT_FONT,
    lineHeight: DEFAULT_LINE_HEIGHT,
    paddingX: PAPER_PADDING_X,
    paddingY: PAPER_PADDING_Y,
  };

  let height = 0;

  // 텍스트 영역
  if (message.content) {
    if (isUser) {
      height += prepareTextLayout(message.content, params, cache).height;
    } else {
      height += prepareMarkdownLayout(message.content, params, cache).height;
    }
  }

  // 장르 버튼
  if (message.genreOptions && message.genreOptions.length > 0) {
    const availableW = msgWidth - PAPER_PADDING_X;
    let rowWidth = 0;
    let rows = 1;

    for (const genre of message.genreOptions) {
      const btnWidth = measureTextWidth(genre, DEFAULT_FONT, cache) + 24; // 패딩
      if (rowWidth + btnWidth + GENRE_BUTTON_GAP > availableW && rowWidth > 0) {
        rows++;
        rowWidth = btnWidth;
      } else {
        rowWidth += btnWidth + GENRE_BUTTON_GAP;
      }
    }
    // "모르겠다" 버튼
    const unknownWidth = measureTextWidth("모르겠다", DEFAULT_FONT, cache) + 24;
    if (rowWidth + unknownWidth + GENRE_BUTTON_GAP > availableW && rowWidth > 0) {
      rows++;
    }

    height += rows * (GENRE_BUTTON_HEIGHT + GENRE_BUTTON_GAP);
  }

  // 추천 카드
  if (message.results && message.results.length > 0) {
    const isSm = containerWidth >= 576; // Mantine sm breakpoint
    const cols = isSm ? 2 : 1;
    const cardRows = Math.ceil(message.results.length / cols);
    height += cardRows * (CARD_HEIGHT + CARD_GAP);
  }

  return Math.max(height, 40); // 최소 높이
}
