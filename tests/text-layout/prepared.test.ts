import { describe, it, expect, vi, beforeEach } from "vitest";
import { prepareTextLayout, prepareMarkdownLayout, estimateMessageHeight, type LayoutParams } from "@/lib/text-layout/prepared";
import { createCache, type FontDescriptor, type MeasureCache } from "@/lib/text-layout/cache";
// estimateMessageHeight는 MessageLike 인터페이스를 받으므로 MessageLike 불필요
type MessageLike = {
  role: "user" | "assistant";
  content: string;
  genreOptions?: string[];
  results?: { id: string }[];
};

// Canvas measureText 모킹: 모든 문자 폭 = 10px 고정
vi.mock("@/lib/text-layout/measure", () => {
  return {
    DEFAULT_FONT: {
      family: "sans-serif",
      size: 14,
      weight: 400,
      style: "normal",
    },
    BOLD_FONT: {
      family: "sans-serif",
      size: 14,
      weight: 700,
      style: "normal",
    },
    HEADING_FONTS: {
      1: { family: "sans-serif", size: 34, weight: 700, style: "normal" },
      2: { family: "sans-serif", size: 26, weight: 700, style: "normal" },
      3: { family: "sans-serif", size: 22, weight: 700, style: "normal" },
    },
    buildCumulativeWidths: (text: string) => {
      const CHAR_WIDTH = 10;
      const arr = new Float64Array(text.length + 1);
      for (let i = 0; i < text.length; i++) {
        arr[i + 1] = arr[i] + CHAR_WIDTH;
      }
      return arr;
    },
    measureTextWidth: (text: string) => text.length * 10,
  };
});

const testFont: FontDescriptor = {
  family: "sans-serif",
  size: 14,
  weight: 400,
  style: "normal",
};

const baseParams: LayoutParams = {
  containerWidth: 200,
  font: testFont,
  lineHeight: 1.5,
  paddingX: 0,
  paddingY: 0,
};

describe("prepareTextLayout", () => {
  let cache: MeasureCache;

  beforeEach(() => {
    cache = createCache();
  });

  it("빈 텍스트 → 0줄, 높이 0", () => {
    const result = prepareTextLayout("", baseParams, cache);
    expect(result.lines).toBe(0);
    expect(result.height).toBe(0);
  });

  it("한 줄에 들어가는 텍스트 → 줄바꿈 없음", () => {
    // 200px 컨테이너, 문자 10px → 20글자까지 한 줄
    const result = prepareTextLayout("abcdefghij", baseParams, cache);
    expect(result.lines).toBe(1);
    expect(result.lineBreaks).toHaveLength(0);
  });

  it("폭 초과 시 줄바꿈 발생", () => {
    // 200px / 10px = 20글자. "hello world test foo" = 20자(공백포함) → 1줄
    // "hello world test foo bar" = 25자 → 2줄
    const text = "hello world test foo bar";
    const result = prepareTextLayout(text, baseParams, cache);
    expect(result.lines).toBeGreaterThan(1);
    expect(result.lineBreaks.length).toBeGreaterThan(0);
  });

  it("띄어쓰기 위치에서 줄바꿈", () => {
    // 200px, 각 글자 10px
    // "aaaaaaaaaa bbbbbbbbbb cccccccccc" = 31자
    // 첫 줄: "aaaaaaaaaa bbbbbbbbbb" = 21자 → 폭 초과
    // 줄바꿈은 공백 위치에서
    const text = "aaaaaaaaaa bbbbbbbbbb cccccccccc";
    const result = prepareTextLayout(text, baseParams, cache);
    expect(result.lines).toBeGreaterThanOrEqual(2);
    // 줄바꿈 인덱스가 공백 근처
    for (const br of result.lineBreaks) {
      const nearby = text[br] === " " || text[br - 1] === " ";
      expect(nearby).toBe(true);
    }
  });

  it("높이 = 줄 수 * fontSize * lineHeight", () => {
    const text = "a".repeat(50); // 50글자, 공백 없어서 강제 줄바꿈
    const result = prepareTextLayout(text, baseParams, cache);
    const expected = result.lines * testFont.size * baseParams.lineHeight;
    expect(result.height).toBe(expected);
  });

  it("paddingX가 가용 폭을 줄임", () => {
    const withPadding = { ...baseParams, paddingX: 40 };
    // 가용 폭: 200 - 40 = 160px → 16글자
    const text = "aaaaaaaaaa bbbbbbbbbb"; // 21자
    const noPad = prepareTextLayout(text, baseParams, cache);
    const padded = prepareTextLayout(text, withPadding, cache);
    expect(padded.lines).toBeGreaterThanOrEqual(noPad.lines);
  });

  it("paddingY가 높이에 추가됨", () => {
    const withPadding = { ...baseParams, paddingY: 24 };
    const text = "hello";
    const result = prepareTextLayout(text, withPadding, cache);
    const lineH = testFont.size * baseParams.lineHeight;
    expect(result.height).toBe(lineH + 24);
  });

  it("한글 텍스트도 띄어쓰기 기준 줄바꿈", () => {
    const text = "안녕하세요 반갑습니다 좋은하루";
    const result = prepareTextLayout(text, baseParams, cache);
    expect(result.lines).toBeGreaterThanOrEqual(1);
    for (const br of result.lineBreaks) {
      const nearby = text[br] === " " || text[br - 1] === " ";
      expect(nearby).toBe(true);
    }
  });

  it("containerWidth가 0 이하면 1줄 반환", () => {
    const narrow = { ...baseParams, containerWidth: 0 };
    const result = prepareTextLayout("hello", narrow, cache);
    expect(result.lines).toBe(1);
  });
});

describe("prepareMarkdownLayout", () => {
  let cache: MeasureCache;

  beforeEach(() => {
    cache = createCache();
  });

  it("일반 텍스트 마크다운 처리", () => {
    const result = prepareMarkdownLayout("hello world", baseParams, cache);
    expect(result.lines).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThan(0);
  });

  it("빈 줄은 단락 간격 추가", () => {
    const withGap = prepareMarkdownLayout("hello\n\nworld", baseParams, cache);
    const without = prepareMarkdownLayout("hello\nworld", baseParams, cache);
    expect(withGap.height).toBeGreaterThan(without.height);
  });

  it("헤딩 파싱", () => {
    const result = prepareMarkdownLayout("## 제목입니다", baseParams, cache);
    expect(result.lines).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThan(0);
  });

  it("볼드 마크다운 기호 제거", () => {
    const result = prepareMarkdownLayout("**볼드 텍스트** 일반", baseParams, cache);
    expect(result.lines).toBeGreaterThanOrEqual(1);
  });

  it("링크 마크다운 기호 제거", () => {
    const result = prepareMarkdownLayout("[링크](http://example.com) 텍스트", baseParams, cache);
    expect(result.lines).toBeGreaterThanOrEqual(1);
  });

  it("인라인 코드 마크다운 기호 제거", () => {
    const result = prepareMarkdownLayout("코드 `inline` 텍스트", baseParams, cache);
    expect(result.lines).toBeGreaterThanOrEqual(1);
  });

  it("빈 마크다운 → 최소 높이", () => {
    const params = { ...baseParams, paddingY: 24 };
    const result = prepareMarkdownLayout("", params, cache);
    expect(result.height).toBeGreaterThanOrEqual(24);
    expect(result.lines).toBe(0);
  });
});

describe("estimateMessageHeight", () => {
  let cache: MeasureCache;

  beforeEach(() => {
    cache = createCache();
  });

  it("사용자 메시지 높이 계산", () => {
    const msg: MessageLike = { role: "user", content: "안녕하세요" };
    const height = estimateMessageHeight(msg, 400, cache);
    expect(height).toBeGreaterThan(0);
  });

  it("어시스턴트 메시지 높이 계산 (마크다운)", () => {
    const msg: MessageLike = { role: "assistant", content: "**추천** 결과입니다" };
    const height = estimateMessageHeight(msg, 400, cache);
    expect(height).toBeGreaterThan(0);
  });

  it("카드 포함 메시지는 카드 높이 추가", () => {
    const withCards: MessageLike = {
      role: "assistant", content: "결과",
      results: [
        { id: "r1" },
        { id: "r2" },
      ],
    };
    const without: MessageLike = { role: "assistant", content: "결과" };
    const h1 = estimateMessageHeight(withCards, 600, cache);
    const h2 = estimateMessageHeight(without, 600, cache);
    expect(h1).toBeGreaterThan(h2);
  });

  it("sm 이상 폭에서 카드 2열", () => {
    const msg: MessageLike = {
      role: "assistant", content: "결과",
      results: [
        { id: "r1" },
        { id: "r2" },
      ],
    };
    const wide = estimateMessageHeight(msg, 600, cache); // 2열
    const narrow = estimateMessageHeight(msg, 400, cache); // 1열
    expect(narrow).toBeGreaterThan(wide);
  });

  it("장르 버튼 포함 시 높이 추가", () => {
    const withGenres: MessageLike = {
      role: "assistant", content: "장르 선택",
      genreOptions: ["액션", "코미디", "공포", "스릴러", "드라마"],
    };
    const without: MessageLike = { role: "assistant", content: "장르 선택" };
    const h1 = estimateMessageHeight(withGenres, 400, cache);
    const h2 = estimateMessageHeight(without, 400, cache);
    expect(h1).toBeGreaterThan(h2);
  });

  it("최소 높이 40px 보장", () => {
    const msg: MessageLike = { role: "user", content: "" };
    const height = estimateMessageHeight(msg, 400, cache);
    expect(height).toBeGreaterThanOrEqual(40);
  });

  it("사용자 메시지는 80% 폭 적용", () => {
    const longText = "이것은 매우 긴 텍스트입니다 ".repeat(10);
    const user: MessageLike = { role: "user", content: longText };
    const assistant: MessageLike = { role: "assistant", content: longText };
    const hUser = estimateMessageHeight(user, 600, cache);
    const hAssistant = estimateMessageHeight(assistant, 600, cache);
    // 사용자 메시지는 폭이 좁으니 더 높아야 함
    expect(hUser).toBeGreaterThanOrEqual(hAssistant);
  });
});
