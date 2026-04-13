create or replace function match_webtoons(
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
  order by w.embedding <=> query_embedding
  limit match_count;
end;
$$;
