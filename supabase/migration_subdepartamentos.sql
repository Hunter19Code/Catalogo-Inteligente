-- Añadir subdepartamentos si ya tenías la tabla creada
alter table categorias
  add column if not exists parent_id uuid references categorias(id) on delete cascade;

create index if not exists categorias_parent_id_idx on categorias(parent_id);
