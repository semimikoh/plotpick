import { describe, it, expect } from "vitest";
import { cleanWikiWebtoons, mergeAll, cleanKakaoCSV, cleanNaverCSV } from "@/core/data/clean";

describe("cleanWikiWebtoons", () => {
  it("50자 미만 설명은 필터링", () => {
    const result = cleanWikiWebtoons([
      { pageid: 1, title: "짧은 웹툰", extract: "너무 짧음", url: "url1", categories: [], source: "wikipedia" as const },
      { pageid: 2, title: "긴 웹툰", extract: "a".repeat(60), url: "url2", categories: [], source: "wikipedia" as const },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("긴 웹툰");
  });

  it("중복 pageid 제거", () => {
    const raw = { pageid: 1, title: "웹툰", extract: "a".repeat(60), url: "url", categories: [], source: "wikipedia" as const };
    const result = cleanWikiWebtoons([raw, raw]);
    expect(result).toHaveLength(1);
  });

  it("제목에서 (만화), (웹툰) 접미사 제거", () => {
    const result = cleanWikiWebtoons([
      { pageid: 1, title: "작품명 (만화)", extract: "a".repeat(60), url: "url", categories: [], source: "wikipedia" as const },
      { pageid: 2, title: "작품명2 (웹툰)", extract: "a".repeat(60), url: "url2", categories: [], source: "wikipedia" as const },
    ]);
    expect(result[0].title).toBe("작품명");
    expect(result[1].title).toBe("작품명2");
  });

  it("카테고리에서 장르 추출", () => {
    const result = cleanWikiWebtoons([{
      pageid: 1,
      title: "웹툰",
      extract: "a".repeat(60),
      url: "url",
      categories: ["분류:코미디 웹 만화", "분류:네이버 웹툰", "분류:대한민국의 만화"],
      source: "wikipedia" as const,
    }]);
    expect(result[0].genres).toContain("코미디 웹 만화");
    expect(result[0].genres).not.toContain("네이버 웹툰");
  });

  it("카테고리에서 플랫폼 추출", () => {
    const result = cleanWikiWebtoons([{
      pageid: 1,
      title: "웹툰",
      extract: "a".repeat(60),
      url: "url",
      categories: ["분류:네이버 웹툰"],
      source: "wikipedia" as const,
    }]);
    expect(result[0].platform).toBe("naver");
  });

  it("id에 wiki- 접두사", () => {
    const result = cleanWikiWebtoons([{
      pageid: 123,
      title: "웹툰",
      extract: "a".repeat(60),
      url: "url",
      categories: [],
      source: "wikipedia" as const,
    }]);
    expect(result[0].id).toBe("wiki-123");
  });
});

describe("cleanKakaoCSV", () => {
  it("헤더 스킵 + 필드 파싱", () => {
    const csv = `,id,url,title,genre,img,desc,key_word
,100,http://example.com,테스트 웹툰,액션/판타지,img.jpg,이것은 충분히 긴 설명입니다 테스트용,keyword`;
    const result = cleanKakaoCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("테스트 웹툰");
    expect(result[0].genres).toEqual(["액션", "판타지"]);
  });

  it("설명 10자 미만 필터링", () => {
    const csv = `,id,url,title,genre,img,desc,key_word
,100,url,제목,장르,img,짧음,kw`;
    const result = cleanKakaoCSV(csv);
    expect(result).toHaveLength(0);
  });
});

describe("cleanNaverCSV", () => {
  it("필드 파싱 + ID 추출", () => {
    // 네이버 CSV 장르는 설명 뒤 쉼표+공백2개 이상으로 구분
    const csv = `제목,"설명이 충분히 길어야 합니다 이것은 테스트  ,  액션 코미디 15세 이용가",http://example.com?titleId=123`;
    const result = cleanNaverCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("제목");
    expect(result[0].id).toBe("naver-123");
  });

  it("설명 10자 미만 필터링", () => {
    const csv = `제목,짧음,장르,url`;
    const result = cleanNaverCSV(csv);
    expect(result).toHaveLength(0);
  });

  it("BOM 제거", () => {
    const csv = `\uFEFF제목,설명이 충분히 길어야 합니다 테스트입니다,장르,url`;
    const result = cleanNaverCSV(csv);
    expect(result[0].title).toBe("제목");
  });
});

describe("mergeAll", () => {
  it("제목 기준 중복 제거", () => {
    const a = [{ id: "1", title: "같은작품", description: "d", url: "u", genres: [], platform: "a", source: "wikipedia" as const }];
    const b = [{ id: "2", title: "같은작품", description: "d2", url: "u2", genres: [], platform: "b", source: "kakao-dataset" as const }];
    const result = mergeAll([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1"); // 먼저 등장한 것 유지
  });

  it("다른 제목은 모두 포함", () => {
    const a = [{ id: "1", title: "작품A", description: "d", url: "u", genres: [], platform: "a", source: "wikipedia" as const }];
    const b = [{ id: "2", title: "작품B", description: "d", url: "u", genres: [], platform: "b", source: "wikipedia" as const }];
    const result = mergeAll([a, b]);
    expect(result).toHaveLength(2);
  });
});
