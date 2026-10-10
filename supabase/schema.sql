-- ============================================================
-- SQL YARD · esquema do banco (Supabase)
-- Rode no SQL Editor do painel do Supabase (uma vez).
-- ============================================================

-- Perfis públicos (apelido e avatar). Nada sensível aqui.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null,
  avatar      text not null default '🕵️',
  created_at  timestamptz not null default now(),
  constraint nickname_fmt check (nickname ~ '^[A-Za-zÀ-ÿ0-9_ .-]{3,20}$'),
  constraint avatar_len   check (char_length(avatar) <= 8)
);
create unique index if not exists profiles_nickname_ci on public.profiles (lower(nickname));

-- Casos resolvidos (escrito SOMENTE pela Edge Function "game").
create table if not exists public.progress (
  user_id   uuid not null references auth.users(id) on delete cascade,
  case_id   text not null,
  xp        int  not null check (xp >= 0 and xp <= 2000),
  hints     int  not null default 0,
  wrongs    int  not null default 0,
  solved_at timestamptz not null default now(),
  primary key (user_id, case_id)
);

-- Dicas usadas / acusações erradas por caso (também só a Edge Function escreve).
create table if not exists public.attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null,
  hints   int  not null default 0,
  wrongs  int  not null default 0,
  primary key (user_id, case_id)
);

-- Caderno de anotações de cada jogador.
create table if not exists public.notes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  case_id    text not null,
  body       text not null default '' check (char_length(body) <= 5000),
  updated_at timestamptz not null default now(),
  primary key (user_id, case_id)
);

-- ---------- Segurança (RLS) ----------
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.attempts enable row level security;
alter table public.notes    enable row level security;

drop policy if exists "perfis visiveis"      on public.profiles;
drop policy if exists "editar meu perfil"    on public.profiles;
drop policy if exists "ver meu progresso"    on public.progress;
drop policy if exists "ver minhas tentativas" on public.attempts;
drop policy if exists "minhas notas"         on public.notes;

create policy "perfis visiveis"       on public.profiles for select using (true);
create policy "editar meu perfil"     on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "ver meu progresso"     on public.progress for select using (auth.uid() = user_id);
create policy "ver minhas tentativas" on public.attempts for select using (auth.uid() = user_id);
create policy "minhas notas"          on public.notes    for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Sem política de INSERT/UPDATE em progress e attempts: só a service_role (Edge Function) grava.

-- ---------- Cria o perfil automaticamente ao criar a conta ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nick text; av text; n int := 0;
begin
  nick := coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), 'detetive');
  if nick !~ '^[A-Za-zÀ-ÿ0-9_ .-]{3,20}$' then nick := 'detetive'; end if;
  av := coalesce(nullif(new.raw_user_meta_data->>'avatar', ''), '🕵️');
  if char_length(av) > 8 then av := '🕵️'; end if;
  loop
    begin
      insert into public.profiles (id, nickname, avatar)
      values (new.id, case when n = 0 then nick else left(nick, 15) || (floor(random() * 9000) + 1000)::int end, av);
      exit;
    exception when unique_violation then
      n := n + 1;
      if n > 6 then raise; end if;
    end;
  end loop;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Funções públicas ----------
create or replace function public.nickname_available(n text)
returns boolean language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where lower(nickname) = lower(trim(n)));
$$;

create or replace function public.leaderboard(lim int default 50)
returns table (rank bigint, nickname text, avatar text, total_xp bigint, solved bigint)
language sql security definer set search_path = public stable as $$
  select row_number() over (order by t.xp desc, t.last_at asc) as rank,
         pr.nickname, pr.avatar, t.xp, t.n
  from (select user_id, sum(xp)::bigint as xp, count(*)::bigint as n, max(solved_at) as last_at
        from public.progress group by user_id) t
  join public.profiles pr on pr.id = t.user_id
  order by 1
  limit least(greatest(lim, 1), 100);
$$;

grant execute on function public.nickname_available(text) to anon, authenticated;
grant execute on function public.leaderboard(int)        to anon, authenticated;
