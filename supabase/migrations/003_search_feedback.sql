create table search_feedback (
  id serial primary key,
  query text not null,
  webtoon_id text not null references webtoons(id),
  created_at timestamptz default now()
);

create index on search_feedback (webtoon_id);
create index on search_feedback (query);
