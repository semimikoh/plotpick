// 공통 검색 결과 타입
export interface ContentResult {
  id: string;
  title: string;
  description: string;
  url: string;
  genres: string[];
  similarity: number;
  // 웹툰 전용 (영화에서는 undefined)
  platform?: string;
  source?: string;
  // 영화 전용 (웹툰에서는 undefined)
  rating?: number;
  release_date?: string;
  poster_url?: string | null;
  cast_members?: string[];
  director?: string;
}
