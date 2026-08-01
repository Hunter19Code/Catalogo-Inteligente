-- Favoritos — esquema escalable
-- Ejecutar en el SQL Editor de Supabase

create extension if not exists "pgcrypto";

-- Categorías con anidación ilimitada
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categorias(id) on delete cascade,
  nombre text not null,
  icono text not null default '📦',
  color text not null default '#94A3B8',
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists categorias_parent_id_idx on categorias(parent_id);
create index if not exists categorias_order_idx on categorias(parent_id, order_index);

do $$ begin
  create type estado_producto as enum (
    'favorito',
    'comprar',
    'comprado',
    'no_comprar'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type historial_accion as enum (
    'comprado',
    'usado',
    'terminado',
    'anadido'
  );
exception when duplicate_object then null;
end $$;

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete cascade,
  nombre text not null,
  marca text,
  descripcion text,
  subtipo text,
  etiquetas text[] default '{}',
  alias text[] default '{}',
  estado estado_producto not null default 'comprar',
  foto_url text,
  favorito boolean not null default false,
  ultima_compra date,
  ultimo_uso date,
  supermercado_habitual text,
  order_index integer not null default 0,
  codigo_barras text,
  created_at timestamptz not null default now()
);

create index if not exists productos_categoria_id_idx on productos(categoria_id);
create index if not exists productos_estado_idx on productos(estado);
create index if not exists productos_order_idx on productos(categoria_id, order_index);
create index if not exists productos_alias_idx on productos using gin (alias);
create index if not exists productos_codigo_barras_idx on productos(codigo_barras);
create index if not exists productos_nombre_idx on productos using gin (
  to_tsvector(
    'spanish',
    coalesce(nombre, '') || ' ' ||
    coalesce(marca, '') || ' ' ||
    coalesce(descripcion, '') || ' ' ||
    coalesce(array_to_string(alias, ' '), '')
  )
);

-- Historial de usos/compras (stats, tickets, recomendaciones)
create table if not exists historial (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  fecha date not null default current_date,
  supermercado text,
  accion historial_accion not null default 'comprado',
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists historial_producto_id_idx on historial(producto_id);
create index if not exists historial_fecha_idx on historial(fecha desc);

-- Futuro: tickets escaneados / IA
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  imagen_url text,
  supermercado text,
  fecha date,
  texto_ocr text,
  raw_json jsonb,
  procesado boolean not null default false,
  created_at timestamptz not null default now()
);

-- Futuro: líneas de ticket → producto
create table if not exists ticket_lineas (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  texto_original text not null,
  precio numeric(10, 2),
  cantidad numeric(10, 3),
  matched boolean not null default false,
  created_at timestamptz not null default now()
);

alter table categorias enable row level security;
alter table productos enable row level security;
alter table historial enable row level security;
alter table tickets enable row level security;
alter table ticket_lineas enable row level security;

drop policy if exists "categorias_public_read" on categorias;
drop policy if exists "categorias_public_write" on categorias;
drop policy if exists "productos_public_read" on productos;
drop policy if exists "productos_public_write" on productos;
drop policy if exists "historial_public_read" on historial;
drop policy if exists "historial_public_write" on historial;
drop policy if exists "tickets_public_all" on tickets;
drop policy if exists "ticket_lineas_public_all" on ticket_lineas;

create policy "categorias_public_read" on categorias for select using (true);
create policy "categorias_public_write" on categorias for all using (true) with check (true);
create policy "productos_public_read" on productos for select using (true);
create policy "productos_public_write" on productos for all using (true) with check (true);
create policy "historial_public_read" on historial for select using (true);
create policy "historial_public_write" on historial for all using (true) with check (true);
create policy "tickets_public_all" on tickets for all using (true) with check (true);
create policy "ticket_lineas_public_all" on ticket_lineas for all using (true) with check (true);

-- Datos iniciales (solo si está vacío)
insert into categorias (nombre, icono, color, order_index)
select * from (values
  ('Comida', '🍝', '#F4A261', 0),
  ('Jabones', '🧴', '#7EB8C9', 1),
  ('Hogar', '🏠', '#A8C686', 2),
  ('Bocatas', '🥪', '#E9C46A', 3),
  ('Paola', '👧', '#E76F51', 4),
  ('Variados', '📦', '#9B8EC4', 5)
) as v(nombre, icono, color, order_index)
where not exists (select 1 from categorias limit 1);
