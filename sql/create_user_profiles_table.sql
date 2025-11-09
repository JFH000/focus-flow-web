create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  age integer check (age between 5 and 120),
  how_met text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create function public.set_user_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute procedure set_user_profiles_updated_at();
