create extension if not exists pg_trgm;

create table admins (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create unique index admins_email_key on admins (lower(email));

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  user_type text not null check (user_type in ('parent','student','school')),
  category text not null check (category in ('scholarship','concert','admission','general_query')),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  phone text not null check (phone ~ '^[+]?[0-9]{7,15}$'),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'new' check (status in ('new','in_progress','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inquiries_created_idx on inquiries (created_at desc, id desc);
create index inquiries_category_created_idx on inquiries (category, created_at desc);
create index inquiries_user_type_created_idx on inquiries (user_type, created_at desc);
create index inquiries_name_trgm on inquiries using gin (name gin_trgm_ops);
create index inquiries_phone_trgm on inquiries using gin (phone gin_trgm_ops);

alter table admins enable row level security;
alter table inquiries enable row level security;
