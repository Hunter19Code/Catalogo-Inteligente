-- Migración desde esquema anterior hacia categorías infinitas + historial + alias

alter table categorias
  add column if not exists parent_id uuid references categorias(id) on delete cascade;

alter table categorias
  add column if not exists order_index integer not null default 0;

create index if not exists categorias_parent_id_idx on categorias(parent_id);
create index if not exists categorias_order_idx on categorias(parent_id, order_index);

alter table productos
  add column if not exists alias text[] default '{}';

alter table productos
  add column if not exists ultimo_uso date;

alter table productos
  add column if not exists supermercado_habitual text;

alter table productos
  add column if not exists order_index integer not null default 0;

alter table productos
  add column if not exists codigo_barras text;

create index if not exists productos_order_idx on productos(categoria_id, order_index);
create index if not exists productos_alias_idx on productos using gin (alias);
create index if not exists productos_codigo_barras_idx on productos(codigo_barras);

do $$ begin
  create type historial_accion as enum (
    'comprado',
    'usado',
    'terminado',
    'anadido'
  );
exception when duplicate_object then null;
end $$;

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

alter table historial enable row level security;
alter table tickets enable row level security;
alter table ticket_lineas enable row level security;

drop policy if exists "historial_public_read" on historial;
drop policy if exists "historial_public_write" on historial;
drop policy if exists "tickets_public_all" on tickets;
drop policy if exists "ticket_lineas_public_all" on ticket_lineas;

create policy "historial_public_read" on historial for select using (true);
create policy "historial_public_write" on historial for all using (true) with check (true);
create policy "tickets_public_all" on tickets for all using (true) with check (true);
create policy "ticket_lineas_public_all" on ticket_lineas for all using (true) with check (true);
