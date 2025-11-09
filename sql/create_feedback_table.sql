-- Feedback table for collecting user comments about Focus Flow
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    where typ.typname = 'feedback_type'
      and nsp.nspname = 'public'
  ) then
    create type public.feedback_type as enum (
      'issue',
      'idea',
      'praise',
      'other'
    );
  end if;
end $$;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feedback_type public.feedback_type not null,
  title text,
  message text not null,
  contact text,
  resolved boolean not null default false,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists feedback_user_id_idx on public.feedback (user_id);
create index if not exists feedback_resolved_idx on public.feedback (resolved);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

