-- ---------------------------------------------------------------------------
-- migration: 20250131120000_create_flashcards_generations_schema
-- purpose: create 10x-cards mvp schema (generations, generation_error_logs,
--          flashcards), indexes, rls policies, and updated_at triggers.
-- affected tables: generations, generation_error_logs, flashcards
-- dependencies: auth.users (supabase auth; pre-existing)
-- notes: tables reference auth.users(id). rls restricts access to own rows.
--        no destructive operations.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. table: generations
-- tracks ai generation sessions (model, counts, source hash, duration) for
-- analytics. referenced by flashcards.generation_id (optional).
-- ---------------------------------------------------------------------------
create table if not exists public.generations (
  id                     bigserial primary key,
  user_id                uuid not null references auth.users (id) on delete cascade,
  model                  varchar(100) not null,
  generated_count        integer not null,
  accepted_unedited_count integer,
  accepted_edited_count   integer,
  source_text_hash       varchar(64) not null,
  source_text_length     integer not null check (source_text_length between 1000 and 10000),
  generation_duration    integer not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.generations is 'ai generation sessions per user; source_text_hash is sha-256 (64 chars).';

-- ---------------------------------------------------------------------------
-- 2. table: generation_error_logs
-- append-only log of failed ai generation attempts (error code, message) for
-- debugging and monitoring. immutable; no updated_at.
-- ---------------------------------------------------------------------------
create table if not exists public.generation_error_logs (
  id                bigserial primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  model             varchar(100) not null,
  source_text_hash  varchar(64) not null,
  source_text_length integer not null check (source_text_length between 1000 and 10000),
  error_code        varchar(100) not null,
  error_message     text not null,
  created_at        timestamptz not null default now()
);

comment on table public.generation_error_logs is 'immutable error log for failed ai generations; append-only.';

-- ---------------------------------------------------------------------------
-- 3. table: flashcards
-- user-owned cards; optional link to generation via generation_id.
-- source: 'ai-full' | 'ai-edited' | 'manual'. updated_at maintained by trigger.
-- ---------------------------------------------------------------------------
create table if not exists public.flashcards (
  id             bigserial primary key,
  front          varchar(200) not null,
  back           varchar(500) not null,
  source         varchar not null check (source in ('ai-full', 'ai-edited', 'manual')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  generation_id  bigint references public.generations (id) on delete set null,
  user_id        uuid not null references auth.users (id) on delete cascade
);

comment on table public.flashcards is 'user flashcards; source: ai-full (accepted as-is), ai-edited (user modified), manual.';
comment on column public.flashcards.generation_id is 'optional link to generation session; set null when generation is deleted.';

-- ---------------------------------------------------------------------------
-- 4. indexes
-- support filtering by user_id and (for flashcards) by generation_id.
-- ---------------------------------------------------------------------------
create index idx_flashcards_user_id on public.flashcards (user_id);
create index idx_flashcards_generation_id on public.flashcards (generation_id);
create index idx_generations_user_id on public.generations (user_id);
create index idx_generation_error_logs_user_id on public.generation_error_logs (user_id);

-- ---------------------------------------------------------------------------
-- 5. row level security (rls)
-- enable rls on all three tables so policies apply.
-- ---------------------------------------------------------------------------
alter table public.flashcards enable row level security;
alter table public.generations enable row level security;
alter table public.generation_error_logs enable row level security;

-- ---------------------------------------------------------------------------
-- 5.1 flashcards policies
-- authenticated: full crud only on rows where auth.uid() = user_id.
-- anon: no access (false) for all operations.
-- ---------------------------------------------------------------------------
create policy flashcards_select_own on public.flashcards
  for select to authenticated
  using (auth.uid() = user_id);

create policy flashcards_insert_own on public.flashcards
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy flashcards_update_own on public.flashcards
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy flashcards_delete_own on public.flashcards
  for delete to authenticated
  using (auth.uid() = user_id);

create policy flashcards_anon_select on public.flashcards
  for select to anon
  using (false);

create policy flashcards_anon_insert on public.flashcards
  for insert to anon
  with check (false);

create policy flashcards_anon_update on public.flashcards
  for update to anon
  using (false)
  with check (false);

create policy flashcards_anon_delete on public.flashcards
  for delete to anon
  using (false);

-- ---------------------------------------------------------------------------
-- 5.2 generations policies
-- same pattern: authenticated own rows only; anon no access.
-- ---------------------------------------------------------------------------
create policy generations_select_own on public.generations
  for select to authenticated
  using (auth.uid() = user_id);

create policy generations_insert_own on public.generations
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy generations_update_own on public.generations
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy generations_delete_own on public.generations
  for delete to authenticated
  using (auth.uid() = user_id);

create policy generations_anon_select on public.generations
  for select to anon
  using (false);

create policy generations_anon_insert on public.generations
  for insert to anon
  with check (false);

create policy generations_anon_update on public.generations
  for update to anon
  using (false)
  with check (false);

create policy generations_anon_delete on public.generations
  for delete to anon
  using (false);

-- ---------------------------------------------------------------------------
-- 5.3 generation_error_logs policies
-- same pattern: authenticated own rows only; anon no access.
-- ---------------------------------------------------------------------------
create policy generation_error_logs_select_own on public.generation_error_logs
  for select to authenticated
  using (auth.uid() = user_id);

create policy generation_error_logs_insert_own on public.generation_error_logs
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy generation_error_logs_update_own on public.generation_error_logs
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy generation_error_logs_delete_own on public.generation_error_logs
  for delete to authenticated
  using (auth.uid() = user_id);

create policy generation_error_logs_anon_select on public.generation_error_logs
  for select to anon
  using (false);

create policy generation_error_logs_anon_insert on public.generation_error_logs
  for insert to anon
  with check (false);

create policy generation_error_logs_anon_update on public.generation_error_logs
  for update to anon
  using (false)
  with check (false);

create policy generation_error_logs_anon_delete on public.generation_error_logs
  for delete to anon
  using (false);

-- ---------------------------------------------------------------------------
-- 6. trigger function: set_updated_at
-- sets new.updated_at to now() on insert/update; used by flashcards and
-- generations (generation_error_logs is append-only, no updated_at).
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is 'trigger function to set updated_at to now() on row insert/update.';

-- ---------------------------------------------------------------------------
-- 7. triggers: apply set_updated_at on flashcards and generations
-- ---------------------------------------------------------------------------
create trigger set_flashcards_updated_at
  before insert or update on public.flashcards
  for each row
  execute function public.set_updated_at();

create trigger set_generations_updated_at
  before insert or update on public.generations
  for each row
  execute function public.set_updated_at();
