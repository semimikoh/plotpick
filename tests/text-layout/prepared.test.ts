import { describe, it, expect, vi, beforeEach } from "vitest";
import { prepareTextLayout, type LayoutParams } from "@/lib/text-layout/prepared";
import { createCache, type FontDescriptor, type MeasureCache } from "@/lib/text-layout/cache";

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
    // "안녕하세요 반갑습니다 좋은하루" = 16자
    const text = "안녕하세요 반갑습니다 좋은하루";
    const result = prepareTextLayout(text, baseParams, cache);
    expect(result.lines).toBeGreaterThanOrEqual(1);
    // 줄바꿈이 있다면 공백 위치에서
    for (const br of result.lineBreaks) {
      const nearby = text[br] === " " || text[br - 1] === " ";
      expect(nearby).toBe(true);
    }
  });
});
