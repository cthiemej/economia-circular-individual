-- Esquema de la versión para clientes individuales del simulador de economía circular.
-- Reemplaza por completo el esquema original multi-equipo/rondas (secciones, equipos,
-- códigos, roster, rondas con horario) por un modelo de una sola persona por evaluación:
--   - Cualquiera se autoregistra (correo+contraseña o Google) y es dueño de sus "evaluations".
--   - claudio.thieme@udp.cl es el único administrador: acceso total (superusuario) a todo.
--   - No hay rondas con horario: cada etapa se abre cuando la anterior queda confirmada
--     (gating secuencial) y se procesa al tiro cuando el cliente confirma, sin esperar a nadie.
-- Las tablas de contenido (diagnoses, regulatory_maps, decisions, rep_declarations,
-- year_results) conservan su estructura interna tal cual la usa el motor de cálculo
-- (src/lib/simulator-engine.ts); solo cambia team_id -> evaluation_id.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

-- Evaluación: lo que antes era runs+sections+teams, para un solo dueño.
-- El cliente puede crear varias (una por empresa, o una por fecha distinta).
create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  focal text not null default 'V' check (focal in ('V', 'J', 'P', 'H')),
  horizon int not null default 4 check (horizon between 1 and 4),
  rebound boolean not null default true,
  projection boolean not null default true,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz not null default now()
);

create table public.diagnoses (
  evaluation_id uuid primary key references public.evaluations(id) on delete cascade,
  gaps jsonb not null default '[]'::jsonb,
  saved_by uuid references public.profiles(id),
  saved_at timestamptz,
  confirmed_at timestamptz
);

create table public.regulatory_maps (
  evaluation_id uuid primary key references public.evaluations(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  saved_by uuid references public.profiles(id),
  saved_at timestamptz,
  confirmed_at timestamptz
);

create table public.decisions (
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  year int not null check (year between 1 and 4),
  practices int[] not null default '{}',
  cards jsonb not null default '{}'::jsonb,
  training_spend numeric not null default 0 check (training_spend >= 0),
  education_spend numeric not null default 0 check (education_spend >= 0),
  saved_by uuid references public.profiles(id),
  saved_at timestamptz,
  confirmed_at timestamptz,
  primary key (evaluation_id, year),
  check (cardinality(practices) <= 3)
);

create table public.rep_declarations (
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  year int not null check (year between 1 and 4),
  tonnes jsonb not null,
  obligation jsonb not null,
  cost_uf numeric not null,
  saved_by uuid references public.profiles(id),
  saved_at timestamptz,
  primary key (evaluation_id, year)
);

create table public.year_results (
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  year int not null check (year between 1 and 5),
  is_projection boolean not null default false,
  result jsonb not null,
  processed_at timestamptz not null default now(),
  primary key (evaluation_id, year)
);

-- El administrador se identifica por correo (no depende de que el perfil ya tenga role='admin',
-- lo que evita condiciones de carrera justo después del registro).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.email(), '') = 'claudio.thieme@udp.cl';
$$;

create or replace function public.is_owner(p_evaluation uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from evaluations where id = p_evaluation and user_id = auth.uid());
$$;

-- Etapas: 0 = diagnóstico, 1 = mapa regulatorio + decisiones/declaración REP del año 1,
-- N (2..horizon) = decisiones/declaración REP del año N. No hay horario: una etapa está
-- abierta para escribir si la evaluación sigue activa, la etapa anterior ya quedó
-- confirmada (o es la etapa 0) y la etapa misma todavía no fue procesada.
create or replace function public.eval_stage_open(p_evaluation uuid, p_stage int) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_horizon int;
  v_status text;
  v_prev_done boolean;
  v_this_done boolean;
begin
  select horizon, status into v_horizon, v_status from evaluations where id = p_evaluation;
  if v_horizon is null or v_status = 'finished' or p_stage < 0 or p_stage > v_horizon then
    return false;
  end if;

  if p_stage = 0 then
    v_prev_done := true;
    select (confirmed_at is not null) into v_this_done from diagnoses where evaluation_id = p_evaluation;
  elsif p_stage = 1 then
    select (confirmed_at is not null) into v_prev_done from diagnoses where evaluation_id = p_evaluation;
    select exists (select 1 from year_results where evaluation_id = p_evaluation and year = 1) into v_this_done;
  else
    select exists (select 1 from year_results where evaluation_id = p_evaluation and year = p_stage - 1) into v_prev_done;
    select exists (select 1 from year_results where evaluation_id = p_evaluation and year = p_stage) into v_this_done;
  end if;

  return coalesce(v_prev_done, false) and not coalesce(v_this_done, false);
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, case when new.email = 'claudio.thieme@udp.cl' then 'admin' else 'client' end)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.stamp_saved_by() returns trigger
language plpgsql as $$
begin
  new.saved_by := auth.uid();
  new.saved_at := coalesce(new.saved_at, now());
  return new;
end $$;
create trigger stamp_diagnoses before insert or update on public.diagnoses for each row execute function public.stamp_saved_by();
create trigger stamp_regmaps before insert or update on public.regulatory_maps for each row execute function public.stamp_saved_by();
create trigger stamp_decisions before insert or update on public.decisions for each row execute function public.stamp_saved_by();
create trigger stamp_rep before insert or update on public.rep_declarations for each row execute function public.stamp_saved_by();

alter table public.profiles enable row level security;
alter table public.evaluations enable row level security;
alter table public.diagnoses enable row level security;
alter table public.regulatory_maps enable row level security;
alter table public.decisions enable row level security;
alter table public.rep_declarations enable row level security;
alter table public.year_results enable row level security;

create policy "own profile or admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admin manages profiles" on public.profiles for update using (public.is_admin());

create policy "owner reads own evaluations" on public.evaluations for select using (user_id = auth.uid() or public.is_admin());
create policy "owner creates own evaluations" on public.evaluations for insert with check (user_id = auth.uid() or public.is_admin());
create policy "owner updates own evaluations" on public.evaluations for update using (user_id = auth.uid() or public.is_admin());
create policy "owner deletes own evaluations" on public.evaluations for delete using (user_id = auth.uid() or public.is_admin());

create policy "read diagnosis" on public.diagnoses for select using (public.is_owner(evaluation_id) or public.is_admin());
create policy "owner writes diagnosis" on public.diagnoses for insert with check ((public.is_owner(evaluation_id) or public.is_admin()) and public.eval_stage_open(evaluation_id, 0));
create policy "owner updates diagnosis" on public.diagnoses for update using ((public.is_owner(evaluation_id) or public.is_admin()) and public.eval_stage_open(evaluation_id, 0));

create policy "read regmap" on public.regulatory_maps for select using (public.is_owner(evaluation_id) or public.is_admin());
create policy "owner writes regmap" on public.regulatory_maps for insert with check ((public.is_owner(evaluation_id) or public.is_admin()) and public.eval_stage_open(evaluation_id, 1));
create policy "owner updates regmap" on public.regulatory_maps for update using ((public.is_owner(evaluation_id) or public.is_admin()) and public.eval_stage_open(evaluation_id, 1));

create policy "read decisions" on public.decisions for select using (public.is_owner(evaluation_id) or public.is_admin());
create policy "owner writes decisions" on public.decisions for insert with check ((public.is_owner(evaluation_id) or public.is_admin()) and public.eval_stage_open(evaluation_id, year));
create policy "owner updates decisions" on public.decisions for update using ((public.is_owner(evaluation_id) or public.is_admin()) and public.eval_stage_open(evaluation_id, year));

create policy "read rep" on public.rep_declarations for select using (public.is_owner(evaluation_id) or public.is_admin());
create policy "owner writes rep" on public.rep_declarations for insert with check ((public.is_owner(evaluation_id) or public.is_admin()) and public.eval_stage_open(evaluation_id, year));
create policy "owner updates rep" on public.rep_declarations for update using ((public.is_owner(evaluation_id) or public.is_admin()) and public.eval_stage_open(evaluation_id, year));

create policy "read results" on public.year_results for select using (public.is_owner(evaluation_id) or public.is_admin());

grant select, insert, update, delete on public.profiles, public.evaluations, public.diagnoses, public.regulatory_maps, public.decisions, public.rep_declarations, public.year_results to authenticated;
grant all on all tables in schema public to service_role;
