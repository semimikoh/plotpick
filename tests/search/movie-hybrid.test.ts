import { describe, it, expect, vi } from "vitest";

// 외부 API 모킹
vi.mock("@/core/search/movie-vector", () => ({
  searchMovies: vi.fn().mockResolvedValue([
    {
      id: "1", title: "스픽 노 이블", description: "desc", url: "url",
      genres: ["공포"], rating: 7.1, release_date: "2024", poster_url: null,
      cast_members: ["제임스 맥어보이"], director: "감독", similarity: 0.45,
    },
    {
      id: "2", title: "다른 영화", description: "desc2", url: "url2",
      genres: ["드라마"], rating: 6.0, release_date: "2023", poster_url: null,
      cast_members: [], director: "", similarity: 0.35,
    },
  ]),
}));

vi.mock("@/core/search/movie-keyword", () => ({
  searchMoviesByKeyword: vi.fn().mockResolvedValue([
    {
      id: "1", title: "스픽 노 이블", description: "desc", url: "url",
      genres: ["공포"], rating: 7.1, release_date: "2024", poster_url: null,
      cast_members: ["제임스 맥어보이"], director: "감독", similarity: 0.85,
    },
  ]),
}));

import { hybridMovieSearch } from "@/core/search/movie-hybrid";

describe("hybridMovieSearch", () => {
  it("벡터 + 키워드 결과를 합산", async () => {
    const results = await hybridMovieSearch("스픽 노 이블");
    expect(results.length).toBeGreaterThan(0);
  });

  it("제목 정확히 일치 시 유사도 높음", async () => {
    const results = await hybridMovieSearch("스픽 노 이블");
    const match = results.find((r) => r.title === "스픽 노 이블");
    expect(match).toBeDefined();
    expect(match!.similarity).toBeGreaterThan(0.8);
  });

  it("cast 매칭 시 유사도 부스트", async () => {
    const results = await hybridMovieSearch("제임스 맥어보이 영화");
    const match = results.find((r) => r.id === "1");
    const other = results.find((r) => r.id === "2");
    if (match && other) {
      expect(match.similarity).toBeGreaterThan(other.similarity);
    }
  });

  it("MIN_DISPLAY_SCORE 이하 필터링", async () => {
    const results = await hybridMovieSearch("스픽 노 이블");
    for (const r of results) {
      expect(r.similarity).toBeGreaterThanOrEqual(0.15);
    }
  });

  it("count 옵션 적용", async () => {
    const results = await hybridMovieSearch("스픽 노 이블", { count: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
