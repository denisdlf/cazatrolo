-- Pruebas del esquema. Cada bloque falla con ASSERT si algo no cuadra.
\set QUIET on
create or replace function pg_temp.espera_error(sql text, codigo text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'Se esperaba error % pero no hubo', codigo;
exception when others then
  if sqlerrm <> codigo then raise exception 'Se esperaba % y vino %', codigo, sqlerrm; end if;
end $$;
grant execute on function pg_temp.espera_error(text, text) to authenticated;

-- 1. Puntaje: todos los ejemplos del enunciado
do $$ begin
  assert calcular_puntaje(array[1]) = 1, '1 local';
  assert calcular_puntaje(array[1,1]) = 3, '2 locales';
  assert calcular_puntaje(array[1,1,1]) = 4.5, '3 locales';
  assert calcular_puntaje(array[2]) = 2, '1 foraneo';
  assert calcular_puntaje(array[1,2]) = 4.5, 'local + foraneo';
  assert calcular_puntaje('{}'::int[]) = 0, 'vacio';
end $$;

-- 2. Periodos en hora de Chile
do $$ begin
  assert periodo_de('2026-11-01 02:30:00+00') = '2026-10', '23:30 del 31-oct en Chile sigue siendo octubre';
  assert periodo_de('2026-11-01 03:30:00+00') = '2026-11';
  assert fin_periodo('2026-10') = '2026-11-01 00:00:00-03'::timestamptz;
end $$;

do $$ begin
  assert not es_foraneo('concepcion ', 'Concepción'), 'sin tilde = local';
  assert es_foraneo('Santiago', 'Concepción');
  assert es_foraneo(null, 'Concepción');
end $$;

-- 3. Configuración inicial (admin)
set role authenticated;
select set_config('test.uid', '00000000-0000-0000-0000-00000000000a', false);
select configurar_grupo('TROLO2026', 'Denis', 'Concepción', '1234');
select pg_temp.espera_error($$select configurar_grupo('X1234','Y','Z','1111')$$, 'YA_CONFIGURADO');
select admin_agregar_miembro('Pedro');
select admin_agregar_miembro('Juan');
select admin_agregar_miembro('Diego');
select admin_agregar_miembro('Ana');
select admin_set_premio('Un completo italiano');
reset role;

-- 4. Login: código, primer ingreso con ciudad, PIN incorrecto, bloqueo
set role authenticated;
select set_config('test.uid', '00000000-0000-0000-0000-0000000000b1', false);
select pg_temp.espera_error($$select * from lista_nombres('malo')$$, 'CODIGO_INCORRECTO');
do $$ declare p uuid; begin
  assert (select count(*) from lista_nombres('trolo2026')) = 5, 'lista con código (sin mayúsculas)';
  select id into p from lista_nombres('TROLO2026') where nombre = 'Pedro';
  perform pg_temp.espera_error(format($q$select ingresar('TROLO2026', %L, '1111')$q$, p), 'FALTA_CIUDAD');
  perform ingresar('TROLO2026', p, '1111', 'Concepción');
  assert (mi_perfil()->>'nombre') = 'Pedro';
end $$;
select set_config('test.uid', '00000000-0000-0000-0000-0000000000c1', false);
do $$ declare j uuid; begin
  select id into j from lista_nombres('TROLO2026') where nombre = 'Juan';
  perform ingresar('TROLO2026', j, '2222', 'Concepción');
  select id into j from lista_nombres('TROLO2026') where nombre = 'Diego';
end $$;
select set_config('test.uid', '00000000-0000-0000-0000-0000000000d1', false);
do $$ declare j uuid; begin
  select id into j from lista_nombres('TROLO2026') where nombre = 'Diego';
  perform ingresar('TROLO2026', j, '3333', 'Santiago');   -- foráneo
  select id into j from lista_nombres('TROLO2026') where nombre = 'Pedro';
  for i in 1..5 loop
    assert ingresar('TROLO2026', j, '9999') = 'PIN_INCORRECTO';
  end loop;
end $$;
do $$ declare j uuid; begin
  select id into j from lista_nombres('TROLO2026') where nombre = 'Pedro';
  -- ya bloqueado aunque ponga el PIN correcto
  assert ingresar('TROLO2026', j, '1111') = 'BLOQUEADO:10', 'bloqueado 10 min';
  assert (mi_perfil()->>'nombre') = 'Diego', 'sigue siendo Diego';
  assert (mi_perfil()->>'foraneo')::boolean, 'Diego es foráneo';
end $$;
select set_config('test.uid', '00000000-0000-0000-0000-0000000000e1', false);
do $$ declare j uuid; begin
  select id into j from lista_nombres('TROLO2026') where nombre = 'Ana';
  perform ingresar('TROLO2026', j, '4444', 'Concepción');
end $$;
-- sin sesión no se puede nada
select set_config('test.uid', '00000000-0000-0000-0000-0000000000ff', false);
select pg_temp.espera_error($$select ranking()$$, 'NO_SESION');
select pg_temp.espera_error($$select admin_set_premio('x')$$, 'NO_SESION');
-- no admin
select set_config('test.uid', '00000000-0000-0000-0000-0000000000c1', false);
select pg_temp.espera_error($$select admin_set_premio('x')$$, 'NO_ADMIN');
-- acceso directo a tablas prohibido
select pg_temp.espera_error($$select * from miembros$$, 'permission denied for table miembros');
reset role;

-- helper (como superusuario) para ids por nombre
create or replace function pg_temp.mid(n text) returns uuid language sql security definer as $$ select id from miembros where nombre = n $$;
grant execute on function pg_temp.mid(text) to authenticated;

-- 5. Cazas, puntaje en el backend y regla de 1 hora (Pedro = b1)
set role authenticated;
select set_config('test.uid', '00000000-0000-0000-0000-0000000000b1', false);
do $$ declare r json; p text := pg_temp.mid('Pedro')::text; begin
  perform pg_temp.espera_error(format($q$select registrar_caza('%s/a.jpg', null, array[%L::uuid])$q$, p, p), 'AUTOCAZA');
  perform pg_temp.espera_error(format($q$select registrar_caza('otro/a.jpg', null, array[%L::uuid])$q$, pg_temp.mid('Juan')), 'FOTO_INVALIDA');
  r := registrar_caza(p || '/1.jpg', null, array[pg_temp.mid('Juan')]);
  assert (r->>'puntos')::numeric = 1, '1 local = 1';
  -- Juan en espera -> bloquea si es el único
  perform pg_temp.espera_error(format($q$select registrar_caza('%s/2.jpg', null, array[%L::uuid])$q$, p, pg_temp.mid('Juan')), 'TODOS_EN_ESPERA');
  -- foto grupal: Juan (espera, no suma) + Diego (foráneo, 2). Solo 1 cuenta -> sin multiplicador
  r := registrar_caza(p || '/3.jpg', null, array[pg_temp.mid('Juan'), pg_temp.mid('Diego')]);
  assert (r->>'puntos')::numeric = 2, format('grupal con uno en espera = 2, vino %s', r->>'puntos');
  assert (select count(*) from tiempos_espera() where segundos_restantes > 3500) = 2, 'Juan y Diego en espera';
end $$;
-- Ana (e1) caza a Juan + Diego (otro cazador: Juan sí vale)
select set_config('test.uid', '00000000-0000-0000-0000-0000000000e1', false);
do $$ declare r json; begin
  r := registrar_caza(pg_temp.mid('Ana') || '/1.jpg', null, array[pg_temp.mid('Juan'), pg_temp.mid('Diego')]);
  assert (r->>'puntos')::numeric = 4.5, 'local + foráneo = 4.5';
end $$;
reset role;
-- Retrocedemos el reloj de las cazas de Pedro 61 minutos
update cazas set creado_en = now() - interval '61 minutes' where cazador_id = pg_temp.mid('Pedro');
set role authenticated;
select set_config('test.uid', '00000000-0000-0000-0000-0000000000b1', false);
do $$ declare r json; begin
  assert (select count(*) from tiempos_espera()) = 0, 'ya pasó la hora';
  r := registrar_caza(pg_temp.mid('Pedro') || '/4.jpg', null, array[pg_temp.mid('Juan'), pg_temp.mid('Ana'), pg_temp.mid('Denis')]);
  assert (r->>'puntos')::numeric = 4.5, '3 locales = 4.5';
end $$;
do $$ begin
  assert (select puntos from ranking() where nombre = 'Pedro') = 7.5, 'Pedro 1+2+4.5';
  assert (select veces_cazado from ranking() where nombre = 'Juan') = 3, 'Juan cazado 3 veces válidas';
end $$;
reset role;

-- 6. Impugnación y votación
set role authenticated;
-- Juan (c1) impugna la caza de Ana
select set_config('test.uid', '00000000-0000-0000-0000-0000000000c1', false);
reset role;
create temp table t_caza as select id from cazas where cazador_id = pg_temp.mid('Ana');
grant select on t_caza to authenticated;
set role authenticated;
select impugnar((select id from t_caza), 'Esa foto es de otro día');
select pg_temp.espera_error($$select impugnar((select id from t_caza), null)$$, 'YA_IMPUGNADA');
select pg_temp.espera_error($$select votar((select id from t_caza), false)$$, 'NO_PUEDES_VOTAR');
do $$ begin
  assert (cazas_lista()::jsonb @? '$[*] ? (@.estado == "en_disputa")'), 'en disputa';
  assert (select puntos from ranking() where nombre = 'Ana') = 0, 'en disputa no suma';
  assert (select puntos_disputa from ranking() where nombre = 'Ana') = 4.5, 'aparte';
end $$;
-- Diego (cazado también) no vota; Ana (cazadora) no vota
select set_config('test.uid', '00000000-0000-0000-0000-0000000000d1', false);
select pg_temp.espera_error($$select votar((select id from t_caza), false)$$, 'NO_PUEDES_VOTAR');
select set_config('test.uid', '00000000-0000-0000-0000-0000000000e1', false);
select pg_temp.espera_error($$select votar((select id from t_caza), true)$$, 'NO_PUEDES_VOTAR');
-- Pedro y Denis votan inválida, nadie válida
select set_config('test.uid', '00000000-0000-0000-0000-0000000000b1', false);
do $$ begin assert votaciones_pendientes() = 1; end $$;
select votar((select id from t_caza), true);
select votar((select id from t_caza), false);   -- cambia su voto
select set_config('test.uid', '00000000-0000-0000-0000-00000000000a', false);
select votar((select id from t_caza), false);
reset role;
update impugnaciones set cierra_en = now() - interval '1 second';
set role authenticated;
do $$ begin
  assert (cazas_lista()::jsonb @? '$[*] ? (@.estado == "anulada")'), 'anulada por votos';
  assert (select puntos from ranking() where nombre = 'Ana') = 0;
end $$;
-- Empate -> se mantiene
reset role;
update votos set valida = true where votante_id = pg_temp.mid('Denis');
set role authenticated;
do $$ begin assert (select puntos from ranking() where nombre = 'Ana') = 4.5, 'empate = válida'; end $$;
-- Fuera de plazo
reset role;
update cazas set creado_en = now() - interval '25 hours' where foto_path like '%/4.jpg';
set role authenticated;
select set_config('test.uid', '00000000-0000-0000-0000-0000000000c1', false);
do $$ declare c uuid; begin
  select (e->>'id')::uuid into c from json_array_elements(cazas_lista()) e where e->>'foto_path' like '%/4.jpg';
  perform pg_temp.espera_error(format('select impugnar(%L)', c), 'FUERA_DE_PLAZO');
end $$;
-- Admin anula
select set_config('test.uid', '00000000-0000-0000-0000-00000000000a', false);
do $$ declare c uuid; begin
  select (e->>'id')::uuid into c from json_array_elements(cazas_lista()) e where e->>'foto_path' like '%/4.jpg';
  perform admin_anular_caza(c, true, 'Trampa');
  assert (select puntos from ranking() where nombre = 'Pedro') = 3, 'Pedro sin la caza anulada';
end $$;
reset role;

-- 7. Cierre de mes
update cazas set periodo = '2026-09', creado_en = '2026-09-15 12:00-03';
update impugnaciones set creado_en = '2026-09-15 13:00-03', cierra_en = '2026-09-16 13:00-03';
set role authenticated;
do $$ declare h json; begin
  h := historial();
  assert json_array_length(h) = 1, 'un mes archivado';
  assert (h->0->>'ganador') = 'Ana', format('ganadora Ana con 4.5, vino %s', h->0->>'ganador');
  assert (h->0->>'premio') = 'Un completo italiano';
  assert (select count(*) from ranking()) = 5 and (select sum(puntos) from ranking()) = 0, 'mes nuevo vacío';
  assert json_array_length(cazas_lista('2026-09')) = 4, 'galería del mes archivado';
end $$;
-- Mes recién terminado con caza de hace < 24 h: no se cierra aún
reset role;
insert into cazas(cazador_id, foto_path, periodo, puntos, creado_en)
  values (pg_temp.mid('Juan'), 'x/y.jpg', '2000-01', 1, now() - interval '1 hour');
set role authenticated;
do $$ begin
  assert json_array_length(historial()) = 1, 'no cierra mientras se puede impugnar';
  assert (select count(*) from periodos_por_confirmar()) = 1;
end $$;
reset role;
\echo '✅ Todas las pruebas SQL pasaron'
