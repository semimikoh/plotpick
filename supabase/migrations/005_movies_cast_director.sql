-- 웹툰 검색 RPC 업데이트: 유사도 임계값 추가
create or replace function match_webtoons(
  query_embedding vector(1536),
  match_count int default 10,
  filter_genres text[] default null,
  similarity_threshold float default 0.2
)
returns table (
  id text,
  title text,
  description text,
  url text,
  genres text[],
  platform text,
  source text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    w.id,
    w.title,
    w.description,
    w.url,
    w.genres,
    w.platform,
    w.source,
    1 - (w.embedding <=> query_embedding) as similarity
  from webtoons w
  where
    w.embedding is not null
    and (filter_genres is null or w.genres && filter_genres)
    and 1 - (w.embedding <=> query_embedding) >= similarity_threshold
  order by w.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 영화 배우/감독 컬럼 + 검색 개선
alter table movies add column if not exists cast_members text[] default '{}';
alter table movies add column if not exists director text default '';

-- 검색 RPC 업데이트: 유사도 임계값 + cast/director 반환
create or replace function match_movies(
  query_embedding vector(1536),
  match_count int default 10,
  filter_genres text[] default null,
  similarity_threshold float default 0.2
)
returns table (
  id text,
  title text,
  description text,
  url text,
  genres text[],
  rating real,
  release_date text,
  poster_url text,
  cast_members text[],
  director text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    m.id,
    m.title,
    m.description,
    m.url,
    m.genres,
    m.rating,
    m.release_date,
    m.poster_url,
    m.cast_members,
    m.director,
    1 - (m.embedding <=> query_embedding) as similarity
  from movies m
  where
    m.embedding is not null
    and (filter_genres is null or m.genres && filter_genres)
    and 1 - (m.embedding <=> query_embedding) >= similarity_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 배우 이름으로 영화 검색하는 RPC
create or replace function search_movies_by_cast(
  search_query text,
  match_count int default 10,
  filter_genres text[] default null
)
returns table (
  id text,
  title text,
  description text,
  url text,
  genres text[],
  rating real,
  release_date text,
  poster_url text,
  cast_members text[],
  director text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    m.id,
    m.title,
    m.description,
    m.url,
    m.genres,
    m.rating,
    m.release_date,
    m.poster_url,
    m.cast_members,
    m.director,
    0.85::float as similarity
  from movies m
  where
    (array_to_string(m.cast_members, ' ') ilike '%' || search_query || '%'
     or m.director ilike '%' || search_query || '%')
    and (filter_genres is null or m.genres && filter_genres)
  order by m.rating desc
  limit match_count;
end;
$$;
