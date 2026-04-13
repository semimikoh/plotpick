-- pgvector 확장 활성화
create extension if not exists vector;

-- 웹툰 테이블
create table webtoons (
  id text primary key,
  title text not null,
  description text not null,
  url text not null,
  genres text[] default '{}',
  platform text not null,
  source text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- HNSW 인덱스 (코사인 유사도)
create index on webtoons
  using hnsw (embedding vector_cosine_ops);

-- 장르 검색용 GIN 인덱스
create index on webtoons
  using gin (genres);
