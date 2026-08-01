# Favoritos

PWA para guardar productos favoritos con categorías ilimitadas, reordenación, historial y alias.

## Arranque

```bash
npm install
npm run dev
```

HTTPS en red local para instalar en el móvil. Sin Supabase usa localStorage.

## Funciones

- Categorías anidadas sin límite (Hogar → Limpieza → Jabones → …)
- Reordenar categorías y productos arrastrando (se guarda `order_index`)
- Alias de producto para búsqueda y futuros tickets
- Historial de compras/usos al marcar como comprado
- PWA instalable

## Supabase

1. Ejecuta `supabase/schema.sql` (proyecto nuevo) o `supabase/migration_v2.sql` (ya existente)
2. Copia `.env.example` → `.env` con URL y anon key
3. Reinicia `npm run dev`

## Instalar en el móvil

1. `npm run dev`
2. Abre la URL `https://192.168.x.x:5173` en el móvil
3. Android: Instalar app · iPhone Safari: Compartir → Añadir a pantalla de inicio
