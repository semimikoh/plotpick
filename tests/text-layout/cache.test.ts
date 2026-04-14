import { describe, it, expect } from "vitest";
import { createCache, fontToKey, type FontDescriptor } from "@/lib/text-layout/cache";

const testFont: FontDescriptor = {
  family: "sans-serif",
  size: 14,
  weight: 400,
  style: "normal",
};

describe("fontToKey", () => {
  it("CSS font shorthand 형식으로 변환", () => {
    const key = fontToKey(testFont);
    expect(key).toBe("normal 400 14px sans-serif");
  });

  it("다른 weight/style이면 다른 키", () => {
    const bold = fontToKey({ ...testFont, weight: 700 });
    const italic = fontToKey({ ...testFont, style: "italic" });
    expect(bold).not.toBe(fontToKey(testFont));
    expect(italic).not.toBe(fontToKey(testFont));
  });
});

describe("createCache", () => {
  it("set 후 get으로 조회 가능", () => {
    const cache = createCache();
    cache.set(testFont, "hello", 42.5);
    expect(cache.get(testFont, "hello")).toBe(42.5);
  });

  it("없는 항목은 undefined 반환", () => {
    const cache = createCache();
    expect(cache.get(testFont, "missing")).toBeUndefined();
  });

  it("같은 키로 덮어쓰기", () => {
    const cache = createCache();
    cache.set(testFont, "hello", 42.5);
    cache.set(testFont, "hello", 50.0);
    expect(cache.get(testFont, "hello")).toBe(50.0);
  });

  it("다른 폰트는 다른 캐시 항목", () => {
    const cache = createCache();
    const boldFont = { ...testFont, weight: 700 };
    cache.set(testFont, "hello", 42.5);
    cache.set(boldFont, "hello", 55.0);
    expect(cache.get(testFont, "hello")).toBe(42.5);
    expect(cache.get(boldFont, "hello")).toBe(55.0);
  });

  it("size 프로퍼티가 정확", () => {
    const cache = createCache();
    expect(cache.size).toBe(0);
    cache.set(testFont, "a", 1);
    cache.set(testFont, "b", 2);
    expect(cache.size).toBe(2);
  });

  it("clear로 전체 삭제", () => {
    const cache = createCache();
    cache.set(testFont, "a", 1);
    cache.set(testFont, "b", 2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get(testFont, "a")).toBeUndefined();
  });

  it("LRU: 최대 항목 초과 시 오래된 항목 제거", () => {
    const cache = createCache();
    // 2001개 삽입 (MAX_ENTRIES = 2000)
    for (let i = 0; i < 2001; i++) {
      cache.set(testFont, `key-${i}`, i);
    }
    // 첫 번째 항목은 제거됨
    expect(cache.get(testFont, "key-0")).toBeUndefined();
    // 마지막 항목은 존재
    expect(cache.get(testFont, "key-2000")).toBe(2000);
    expect(cache.size).toBe(2000);
  });
});
