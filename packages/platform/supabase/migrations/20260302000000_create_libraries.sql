create table public.libraries (
  id                      text primary key,
  name                    text not null,
  email                   text not null,
  authentication_status   text not null default 'unauthenticated'
);
