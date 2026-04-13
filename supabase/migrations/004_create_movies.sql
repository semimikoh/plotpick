create table movies (
  id text primary key,
  title text not null,
  description text not null,
  url text not null,
  genres text[] default '{}',
  rating real,
  release_date text,
  poster_url text,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index on movies using hnsw (embedding vector_cosine_ops);
create index on movies using gin (genres);

-- 영화 검색 RPC
create or replace function match_movies(
  query_embedding vector(1536),
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
    1 - (m.embedding <=> query_embedding) as similarity
  from movies m
  where
    m.embedding is not null
    and (filter_genres is null or m.genres && filter_genres)
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;
