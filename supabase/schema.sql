-- =====================================================================
-- CAZATROLO · Esquema completo de base de datos para Supabase
-- Pégalo entero en Supabase → SQL Editor → New query → Run.
-- Se puede volver a ejecutar sin perder datos (es idempotente).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

-- Configuración global (una sola fila)
create table if not exists public.config (
  id             int primary key default 1 check (id = 1),
  codigo_grupo   text not null,
  premio         text not null default 'Por definir 🏆',
  ciudad_local   text not null default 'Concepción'
);

create table if not exists public.miembros (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null unique,
  ciudad         text,                       -- null = aún no se registra
  pin_hash       text,                       -- null = aún no crea PIN
  es_admin       boolean not null default false,
  activo         boolean not null default true,
  intentos_fallidos int not null default 0,
  bloqueado_hasta timestamptz,
  creado_en      timestamptz not null default now()
);

-- Une cada dispositivo (usuario anónimo de Supabase Auth) con un miembro
create table if not exists public.sesiones (
  auth_uid       uuid primary key,
  miembro_id     uuid not null references public.miembros(id) on delete cascade,
  creado_en      timestamptz not null default now()
);

create table if not exists public.cazas (
  id             uuid primary key default gen_random_uuid(),
  cazador_id     uuid not null references public.miembros(id),
  foto_path      text not null,
  miniatura_path text,
  creado_en      timestamptz not null default now(),  -- hora del SERVIDOR
  periodo        text not null,                       -- 'YYYY-MM' en hora de Chile
  puntos         numeric(6,1) not null,
  anulada_admin  boolean not null default false,
  anulada_motivo text
);
create index if not exists cazas_periodo_idx on public.cazas(periodo);

create table if not exists public.caza_cazados (
  caza_id        uuid not null references public.cazas(id) on delete cascade,
  cazado_id      uuid not null references public.miembros(id),
  foraneo        boolean not null,     -- foto de la ciudad al momento de la caza
  cuenta         boolean not null,     -- false = estaba en tiempo de espera
  puntos_base    int not null,         -- 0, 1 o 2
  primary key (caza_id, cazado_id)
);
create index if not exists caza_cazados_cazado_idx on public.caza_cazados(cazado_id);

create table if not exists public.impugnaciones (
  caza_id        uuid primary key references public.cazas(id) on delete cascade,
  impugnador_id  uuid not null references public.miembros(id),
  comentario     text,
  creado_en      timestamptz not null default now(),
  cierra_en      timestamptz not null
);

create table if not exists public.votos (
  caza_id        uuid not null references public.impugnaciones(caza_id) on delete cascade,
  votante_id     uuid not null references public.miembros(id),
  valida         boolean not null,
  creado_en      timestamptz not null default now(),
  primary key (caza_id, votante_id)
);

create table if not exists public.periodos (
  periodo        text primary key,     -- 'YYYY-MM'
  premio         text not null,
  ganador_id     uuid references public.miembros(id),
  ganador_puntos numeric(7,1),
  ranking        jsonb not null,
  cerrado_en     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Seguridad: nadie toca las tablas directamente. Todo pasa por funciones.
-- ---------------------------------------------------------------------
alter table public.config        enable row level security;
alter table public.miembros      enable row level security;
alter table public.sesiones      enable row level security;
alter table public.cazas         enable row level security;
alter table public.caza_cazados  enable row level security;
alter table public.impugnaciones enable row level security;
alter table public.votos         enable row level security;
alter table public.periodos      enable row level security;
revoke all on public.config, public.miembros, public.sesiones, public.cazas,
  public.caza_cazados, public.impugnaciones, public.votos, public.periodos
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create or replace function public.periodo_de(ts timestamptz)
returns text language sql immutable as $$
  select to_char(ts at time zone 'America/Santiago', 'YYYY-MM')
$$;

-- Fin del periodo (primer instante del mes siguiente, hora de Chile)
create or replace function public.fin_periodo(p text)
returns timestamptz language sql immutable as $$
  select ((to_date(p, 'YYYY-MM') + interval '1 month')::timestamp)
         at time zone 'America/Santiago'
$$;

-- Regla de puntaje (fuente de verdad). Recibe un arreglo con los puntos base
-- de los cazados que SÍ cuentan (1 = local, 2 = foráneo).
create or replace function public.calcular_puntaje(bases int[])
returns numeric language sql immutable as $$
  select case
    when coalesce(array_length(bases, 1), 0) = 0 then 0
    when array_length(bases, 1) >= 2 then (select sum(b) from unnest(bases) b) * 1.5
    else (select sum(b) from unnest(bases) b)::numeric
  end
$$;

-- ¿Es foráneo? Compara sin mayúsculas, tildes ni espacios ("concepcion" = "Concepción")
create or replace function public.es_foraneo(ciudad text, ciudad_local text)
returns boolean language sql immutable as $$
  select lower(translate(trim(coalesce(ciudad, '')), 'áéíóúüÁÉÍÓÚÜ', 'aeiouuAEIOUU'))
      <> lower(translate(trim(ciudad_local), 'áéíóúüÁÉÍÓÚÜ', 'aeiouuAEIOUU'))
$$;

-- Miembro asociado al dispositivo actual (o null)
create or replace function public.yo_id()
returns uuid language sql stable security definer set search_path = public as $$
  select s.miembro_id from sesiones s join miembros m on m.id = s.miembro_id
  where s.auth_uid = auth.uid() and m.activo
$$;

create or replace function public.exigir_miembro()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid := yo_id();
begin
  if v is null then raise exception 'NO_SESION' using hint = 'Debes iniciar sesión'; end if;
  return v;
end $$;

create or replace function public.exigir_admin()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid := exigir_miembro();
begin
  if not (select es_admin from miembros where id = v) then
    raise exception 'NO_ADMIN' using hint = 'Solo el administrador puede hacer esto';
  end if;
  return v;
end $$;

-- Estado de una caza: 'valida' | 'en_disputa' | 'anulada'
create or replace function public.estado_caza(c public.cazas)
returns text language sql stable security definer set search_path = public as $$
  select case
    when c.anulada_admin then 'anulada'
    when i.caza_id is null then 'valida'
    when now() < i.cierra_en then 'en_disputa'
    when (select count(*) filter (where not v.valida) > count(*) filter (where v.valida)
          from votos v where v.caza_id = c.id) then 'anulada'
    else 'valida'
  end
  from (select 1) x left join impugnaciones i on i.caza_id = c.id
$$;

-- Vista interna con el estado calculado
create or replace view public.cazas_estado with (security_invoker = true) as
  select c.*, public.estado_caza(c) as estado from public.cazas c;
revoke all on public.cazas_estado from anon, authenticated;

-- ---------------------------------------------------------------------
-- Configuración inicial y acceso
-- ---------------------------------------------------------------------

-- Solo funciona UNA vez: cuando todavía no hay configuración.
create or replace function public.configurar_grupo(p_codigo text, p_admin_nombre text, p_admin_ciudad text, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if exists (select 1 from config) then raise exception 'YA_CONFIGURADO'; end if;
  if length(trim(p_codigo)) < 4 then raise exception 'CODIGO_CORTO'; end if;
  if p_pin !~ '^\d{4}$' then raise exception 'PIN_INVALIDO'; end if;
  insert into config(codigo_grupo) values (trim(p_codigo));
  insert into miembros(nombre, ciudad, pin_hash, es_admin)
    values (trim(p_admin_nombre), trim(p_admin_ciudad), crypt(p_pin, gen_salt('bf')), true)
    returning id into v_id;
  insert into sesiones(auth_uid, miembro_id) values (auth.uid(), v_id)
    on conflict (auth_uid) do update set miembro_id = excluded.miembro_id;
end $$;

create or replace function public.grupo_configurado()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from config)
$$;

-- Devuelve la lista de nombres solo si el código de grupo es correcto
create or replace function public.lista_nombres(p_codigo text)
returns table(id uuid, nombre text, registrado boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from config where lower(codigo_grupo) = lower(trim(p_codigo))) then
    raise exception 'CODIGO_INCORRECTO';
  end if;
  return query select m.id, m.nombre, m.pin_hash is not null
    from miembros m where m.activo order by m.nombre;
end $$;

-- Primera vez: crea PIN y ciudad. Siguientes veces: valida PIN.
-- Devuelve 'OK', 'PIN_INCORRECTO' o 'BLOQUEADO:<minutos>'. No lanza error en esos
-- casos para que el contador de intentos fallidos sí quede guardado.
drop function if exists public.ingresar(text, uuid, text, text);
create or replace function public.ingresar(p_codigo text, p_miembro uuid, p_pin text, p_ciudad text default null)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare m miembros;
begin
  if auth.uid() is null then raise exception 'NO_AUTH'; end if;
  if not exists (select 1 from config where lower(codigo_grupo) = lower(trim(p_codigo))) then
    raise exception 'CODIGO_INCORRECTO';
  end if;
  select * into m from miembros where id = p_miembro and activo for update;
  if not found then raise exception 'MIEMBRO_NO_EXISTE'; end if;
  if p_pin !~ '^\d{4}$' then raise exception 'PIN_INVALIDO'; end if;

  if m.pin_hash is null then
    if coalesce(trim(p_ciudad), '') = '' then raise exception 'FALTA_CIUDAD'; end if;
    update miembros set pin_hash = crypt(p_pin, gen_salt('bf')), ciudad = trim(p_ciudad),
      intentos_fallidos = 0 where id = m.id;
  else
    if m.bloqueado_hasta is not null and m.bloqueado_hasta > now() then
      return 'BLOQUEADO:' || ceil(extract(epoch from m.bloqueado_hasta - now()) / 60)::int;
    end if;
    if m.pin_hash <> crypt(p_pin, m.pin_hash) then
      update miembros set intentos_fallidos = intentos_fallidos + 1,
        bloqueado_hasta = case when intentos_fallidos + 1 >= 5 then now() + interval '10 minutes' end
        where id = m.id;
      return 'PIN_INCORRECTO';
    end if;
    update miembros set intentos_fallidos = 0, bloqueado_hasta = null where id = m.id;
  end if;

  insert into sesiones(auth_uid, miembro_id) values (auth.uid(), m.id)
    on conflict (auth_uid) do update set miembro_id = excluded.miembro_id, creado_en = now();
  return 'OK';
end $$;

create or replace function public.salir()
returns void language sql security definer set search_path = public as $$
  delete from sesiones where auth_uid = auth.uid()
$$;

create or replace function public.cambiar_pin(p_actual text, p_nuevo text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v uuid := exigir_miembro(); h text;
begin
  select pin_hash into h from miembros where id = v;
  if h <> crypt(p_actual, h) then raise exception 'PIN_INCORRECTO'; end if;
  if p_nuevo !~ '^\d{4}$' then raise exception 'PIN_INVALIDO'; end if;
  update miembros set pin_hash = crypt(p_nuevo, gen_salt('bf')) where id = v;
end $$;

-- Datos de la sesión actual
create or replace function public.mi_perfil()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', m.id, 'nombre', m.nombre, 'ciudad', m.ciudad, 'es_admin', m.es_admin,
    'foraneo', es_foraneo(m.ciudad, c.ciudad_local),
    'premio', c.premio, 'ciudad_local', c.ciudad_local,
    'ahora', now(), 'periodo', periodo_de(now()))
  from miembros m cross join config c where m.id = yo_id()
$$;

create or replace function public.miembros_lista()
returns table(id uuid, nombre text, ciudad text, foraneo boolean, es_admin boolean, registrado boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform exigir_miembro();
  return query select m.id, m.nombre, m.ciudad,
    es_foraneo(m.ciudad, c.ciudad_local),
    m.es_admin, m.pin_hash is not null
  from miembros m cross join config c where m.activo order by m.nombre;
end $$;

-- ---------------------------------------------------------------------
-- Cazas
-- ---------------------------------------------------------------------

-- Minutos que faltan para poder cazar a cada persona (0 = disponible)
create or replace function public.tiempos_espera()
returns table(cazado_id uuid, segundos_restantes int)
language plpgsql stable security definer set search_path = public as $$
declare v uuid := exigir_miembro();
begin
  return query
    select cc.cazado_id,
      greatest(0, ceil(extract(epoch from max(c.creado_en) + interval '1 hour' - now())))::int
    from cazas_estado c join caza_cazados cc on cc.caza_id = c.id
    where c.cazador_id = v and cc.cuenta and c.estado <> 'anulada'
      and c.creado_en > now() - interval '1 hour'
    group by cc.cazado_id;
end $$;

create or replace function public.registrar_caza(p_foto_path text, p_miniatura_path text, p_cazados uuid[])
returns json language plpgsql security definer set search_path = public as $$
declare
  v uuid := exigir_miembro();
  v_caza uuid;
  v_bases int[] := '{}';
  v_puntos numeric;
  r record;
  v_local text;
begin
  if p_cazados is null or array_length(p_cazados, 1) is null then raise exception 'SIN_CAZADOS'; end if;
  if v = any(p_cazados) then raise exception 'AUTOCAZA'; end if;
  if p_foto_path not like v::text || '/%' then raise exception 'FOTO_INVALIDA'; end if;
  if (select count(*) from miembros where id = any(p_cazados) and activo) <> array_length(p_cazados, 1)
     or (select count(distinct x) from unnest(p_cazados) x) <> array_length(p_cazados, 1) then
    raise exception 'CAZADOS_INVALIDOS';
  end if;

  -- Evita condiciones de carrera: una caza a la vez por cazador
  perform pg_advisory_xact_lock(hashtext(v::text));
  select ciudad_local into v_local from config;

  insert into cazas(cazador_id, foto_path, miniatura_path, periodo, puntos)
    values (v, p_foto_path, p_miniatura_path, periodo_de(now()), 0)
    returning id into v_caza;

  for r in
    select m.id, es_foraneo(m.ciudad, v_local) as foraneo,
      exists (
        select 1 from cazas_estado c join caza_cazados cc on cc.caza_id = c.id
        where c.cazador_id = v and cc.cazado_id = m.id and cc.cuenta
          and c.estado <> 'anulada' and c.id <> v_caza
          and c.creado_en > now() - interval '1 hour') as en_espera
    from miembros m where m.id = any(p_cazados)
  loop
    insert into caza_cazados(caza_id, cazado_id, foraneo, cuenta, puntos_base)
      values (v_caza, r.id, r.foraneo, not r.en_espera,
              case when r.en_espera then 0 when r.foraneo then 2 else 1 end);
    if not r.en_espera then
      v_bases := v_bases || (case when r.foraneo then 2 else 1 end);
    end if;
  end loop;

  if array_length(v_bases, 1) is null then
    raise exception 'TODOS_EN_ESPERA';   -- hace rollback de todo
  end if;

  v_puntos := calcular_puntaje(v_bases);
  update cazas set puntos = v_puntos where id = v_caza;
  return json_build_object('id', v_caza, 'puntos', v_puntos);
end $$;

-- Listado de cazas (galería). p_periodo null = mes actual
create or replace function public.cazas_lista(p_periodo text default null, p_caza uuid default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare v uuid := exigir_miembro();
begin
  return coalesce((
    select json_agg(x order by x.creado_en desc) from (
      select c.id, c.cazador_id, m.nombre as cazador, c.foto_path, c.miniatura_path,
        c.creado_en, c.periodo, c.puntos, c.estado, c.anulada_admin, c.anulada_motivo,
        (select json_agg(json_build_object('id', cc.cazado_id, 'nombre', mm.nombre,
            'foraneo', cc.foraneo, 'cuenta', cc.cuenta, 'puntos_base', cc.puntos_base) order by mm.nombre)
         from caza_cazados cc join miembros mm on mm.id = cc.cazado_id where cc.caza_id = c.id) as cazados,
        (select json_build_object('impugnador_id', i.impugnador_id, 'impugnador', mi.nombre,
            'comentario', i.comentario, 'creado_en', i.creado_en, 'cierra_en', i.cierra_en,
            'votos_valida', (select count(*) from votos vv where vv.caza_id = c.id and vv.valida),
            'votos_invalida', (select count(*) from votos vv where vv.caza_id = c.id and not vv.valida),
            'mi_voto', (select vv.valida from votos vv where vv.caza_id = c.id and vv.votante_id = v))
         from impugnaciones i join miembros mi on mi.id = i.impugnador_id where i.caza_id = c.id) as impugnacion,
        c.creado_en + interval '24 hours' as impugnable_hasta
      from cazas_estado c join miembros m on m.id = c.cazador_id
      where (p_caza is not null and c.id = p_caza)
         or (p_caza is null and c.periodo = coalesce(p_periodo, periodo_de(now())))
    ) x), '[]'::json);
end $$;

-- ---------------------------------------------------------------------
-- Ranking
-- ---------------------------------------------------------------------
create or replace function public.ranking_calc(p_periodo text)
returns table(miembro_id uuid, nombre text, puntos numeric, puntos_disputa numeric, cazas bigint, veces_cazado bigint)
language sql stable security definer set search_path = public as $$
  select m.id, m.nombre,
    coalesce((select sum(c.puntos) from cazas_estado c where c.cazador_id = m.id
              and c.periodo = p_periodo and c.estado = 'valida'), 0),
    coalesce((select sum(c.puntos) from cazas_estado c where c.cazador_id = m.id
              and c.periodo = p_periodo and c.estado = 'en_disputa'), 0),
    (select count(*) from cazas_estado c where c.cazador_id = m.id
              and c.periodo = p_periodo and c.estado = 'valida'),
    (select count(*) from cazas_estado c join caza_cazados cc on cc.caza_id = c.id
              where cc.cazado_id = m.id and cc.cuenta and c.periodo = p_periodo and c.estado = 'valida')
  from miembros m
  where m.activo or exists (select 1 from cazas c where c.cazador_id = m.id and c.periodo = p_periodo)
  order by 3 desc, 5 desc, 2
$$;

create or replace function public.ranking(p_periodo text default null)
returns table(miembro_id uuid, nombre text, puntos numeric, puntos_disputa numeric, cazas bigint, veces_cazado bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform exigir_miembro();
  return query select * from ranking_calc(coalesce(p_periodo, periodo_de(now())));
end $$;

-- ---------------------------------------------------------------------
-- Cierre de periodos
-- Un mes se cierra cuando terminó Y ya no hay cazas de ese mes que se
-- puedan impugnar o que estén en votación (máximo 48 h después del fin).
-- ---------------------------------------------------------------------
create or replace function public.cerrar_periodos()
returns int language plpgsql security definer set search_path = public as $$
declare p text; n int := 0; v_rank jsonb; v_top record;
begin
  for p in
    select distinct c.periodo from cazas c
    where c.periodo < periodo_de(now())
      and not exists (select 1 from periodos pp where pp.periodo = c.periodo)
    order by 1
  loop
    if exists (select 1 from cazas c where c.periodo = p and c.creado_en > now() - interval '24 hours')
       or exists (select 1 from cazas c join impugnaciones i on i.caza_id = c.id
                  where c.periodo = p and i.cierra_en > now()) then
      continue;  -- aún no se puede cerrar
    end if;
    select jsonb_agg(to_jsonb(r)) into v_rank from ranking_calc(p) r;
    select * into v_top from ranking_calc(p) r limit 1;
    insert into periodos(periodo, premio, ganador_id, ganador_puntos, ranking)
      values (p, (select premio from config),
              case when v_top.puntos > 0 then v_top.miembro_id end,
              v_top.puntos, coalesce(v_rank, '[]'::jsonb))
      on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.historial()
returns json language plpgsql security definer set search_path = public as $$
begin
  perform exigir_miembro();
  perform cerrar_periodos();
  return coalesce((select json_agg(json_build_object(
      'periodo', p.periodo, 'premio', p.premio, 'ganador_id', p.ganador_id,
      'ganador', m.nombre, 'ganador_puntos', p.ganador_puntos, 'ranking', p.ranking,
      'total_cazas', (select count(*) from cazas c where c.periodo = p.periodo))
    order by p.periodo desc)
    from periodos p left join miembros m on m.id = p.ganador_id), '[]'::json);
end $$;

-- Periodos terminados pero aún esperando impugnaciones
create or replace function public.periodos_por_confirmar()
returns setof text language plpgsql security definer set search_path = public as $$
begin
  perform exigir_miembro();
  perform cerrar_periodos();
  return query select distinct c.periodo from cazas c
    where c.periodo < periodo_de(now())
      and not exists (select 1 from periodos p where p.periodo = c.periodo);
end $$;

-- ---------------------------------------------------------------------
-- Impugnación y votación
-- ---------------------------------------------------------------------
create or replace function public.impugnar(p_caza uuid, p_comentario text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_miembro(); c cazas_estado;
begin
  select * into c from cazas_estado where id = p_caza;
  if not found then raise exception 'CAZA_NO_EXISTE'; end if;
  if not exists (select 1 from caza_cazados where caza_id = p_caza and cazado_id = v) then
    raise exception 'NO_ERES_CAZADO';
  end if;
  if c.estado = 'anulada' then raise exception 'YA_ANULADA'; end if;
  if now() > c.creado_en + interval '24 hours' then raise exception 'FUERA_DE_PLAZO'; end if;
  if exists (select 1 from impugnaciones where caza_id = p_caza) then raise exception 'YA_IMPUGNADA'; end if;
  insert into impugnaciones(caza_id, impugnador_id, comentario, cierra_en)
    values (p_caza, v, nullif(trim(p_comentario), ''), now() + interval '24 hours');
end $$;

create or replace function public.votar(p_caza uuid, p_valida boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_miembro(); i impugnaciones;
begin
  select * into i from impugnaciones where caza_id = p_caza;
  if not found then raise exception 'SIN_IMPUGNACION'; end if;
  if now() >= i.cierra_en then raise exception 'VOTACION_CERRADA'; end if;
  if exists (select 1 from cazas where id = p_caza and (cazador_id = v or anulada_admin))
     or exists (select 1 from caza_cazados where caza_id = p_caza and cazado_id = v) then
    raise exception 'NO_PUEDES_VOTAR';
  end if;
  insert into votos(caza_id, votante_id, valida) values (p_caza, v, p_valida)
    on conflict (caza_id, votante_id) do update set valida = excluded.valida, creado_en = now();
end $$;

-- Votaciones abiertas donde yo puedo votar y aún no voto (para avisos)
create or replace function public.votaciones_pendientes()
returns int language plpgsql stable security definer set search_path = public as $$
declare v uuid := exigir_miembro();
begin
  return (select count(*) from impugnaciones i join cazas c on c.id = i.caza_id
    where i.cierra_en > now() and not c.anulada_admin and c.cazador_id <> v
      and not exists (select 1 from caza_cazados cc where cc.caza_id = c.id and cc.cazado_id = v)
      and not exists (select 1 from votos vv where vv.caza_id = c.id and vv.votante_id = v));
end $$;

-- ---------------------------------------------------------------------
-- Administración
-- ---------------------------------------------------------------------
create or replace function public.admin_agregar_miembro(p_nombre text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exigir_admin();
  if coalesce(trim(p_nombre), '') = '' then raise exception 'NOMBRE_VACIO'; end if;
  insert into miembros(nombre) values (trim(p_nombre))
    on conflict (nombre) do update set activo = true;
end $$;

create or replace function public.admin_quitar_miembro(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exigir_admin() = p_id then raise exception 'NO_PUEDES_QUITARTE'; end if;
  update miembros set activo = false where id = p_id;
  delete from sesiones where miembro_id = p_id;
end $$;

create or replace function public.admin_resetear_pin(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exigir_admin();
  update miembros set pin_hash = null, intentos_fallidos = 0, bloqueado_hasta = null where id = p_id;
  delete from sesiones where miembro_id = p_id;
end $$;

create or replace function public.admin_editar_ciudad(p_id uuid, p_ciudad text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exigir_admin();
  update miembros set ciudad = nullif(trim(p_ciudad), '') where id = p_id;
end $$;

create or replace function public.admin_set_premio(p_premio text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exigir_admin();
  update config set premio = coalesce(nullif(trim(p_premio), ''), 'Por definir 🏆');
end $$;

create or replace function public.admin_anular_caza(p_caza uuid, p_anular boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exigir_admin();
  update cazas set anulada_admin = p_anular,
    anulada_motivo = case when p_anular then nullif(trim(p_motivo), '') end
  where id = p_caza;
end $$;

create or replace function public.admin_set_codigo(p_codigo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exigir_admin();
  if length(trim(p_codigo)) < 4 then raise exception 'CODIGO_CORTO'; end if;
  update config set codigo_grupo = trim(p_codigo);
end $$;

-- ---------------------------------------------------------------------
-- Permisos de ejecución: solo usuarios con sesión de Supabase (anónima)
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.configurar_grupo(text, text, text, text), public.grupo_configurado(),
  public.lista_nombres(text), public.ingresar(text, uuid, text, text), public.salir(),
  public.cambiar_pin(text, text), public.mi_perfil(), public.miembros_lista(),
  public.tiempos_espera(), public.registrar_caza(text, text, uuid[]),
  public.cazas_lista(text, uuid), public.ranking(text), public.historial(),
  public.periodos_por_confirmar(), public.impugnar(uuid, text), public.votar(uuid, boolean),
  public.votaciones_pendientes(), public.admin_agregar_miembro(text),
  public.admin_quitar_miembro(uuid), public.admin_resetear_pin(uuid),
  public.admin_editar_ciudad(uuid, text), public.admin_set_premio(text),
  public.admin_anular_caza(uuid, boolean, text), public.admin_set_codigo(text)
to authenticated;

-- ---------------------------------------------------------------------
-- Almacenamiento de fotos (bucket privado "cazas")
-- Cada miembro solo sube dentro de su carpeta <su id>/...
-- Todos los miembros pueden ver todas las fotos.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cazas', 'cazas', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "cazas_subir" on storage.objects;
create policy "cazas_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'cazas' and (storage.foldername(name))[1] = public.yo_id()::text);

drop policy if exists "cazas_ver" on storage.objects;
create policy "cazas_ver" on storage.objects for select to authenticated
  using (bucket_id = 'cazas' and public.yo_id() is not null);

grant execute on function public.yo_id() to authenticated;
