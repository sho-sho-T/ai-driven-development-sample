create table public.books (
  id            text        primary key,
  isbn          text        not null unique,
  title         text        not null,
  author        text        not null,
  publisher     text        not null default '',
  published_year integer,
  status        text        not null default 'available'
);
