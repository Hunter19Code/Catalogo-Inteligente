# Importación de listas desde imágenes — Fase 2

## Motor implementado

La Edge Function `analyze-shopping-image` recibe imágenes como campos repetidos
`images` en `multipart/form-data`. El flujo es:

1. Supabase valida el JWT y la función vuelve a comprobar la sesión con Auth.
2. Se limita cantidad y tamaño de los archivos.
3. Se comprueban las firmas binarias; no se confía en nombre o MIME declarado.
4. Se calcula SHA-256 y se eliminan duplicados exactos dentro de la petición.
5. Se envían los bytes originales a Gemini con resolución alta.
6. Gemini debe responder usando el JSON Schema de la Fase 1.
7. La respuesta vuelve a validarse con Zod y con el contexto de la petición.
8. Solo el resultado validado se devuelve al cliente.

No se almacena la imagen ni el resultado. La función tampoco consulta o modifica
productos, por lo que un fallo no puede afectar a la lista actual.

## Conservación de información

En esta fase no se recomprime, recorta ni altera la imagen. El modelo recibe el
original y las instrucciones para considerar rotación, perspectiva, contraste,
columnas, mala iluminación y escritura difícil. Esto evita destruir trazos
antes de disponer de métricas que demuestren que una transformación mejora el
reconocimiento.

Las variantes corregidas se podrán añadir como fallback medido, conservando
siempre el original. HEIC/HEIF se aceptan además de JPEG, PNG y WebP.

## Límites actuales

- 4 imágenes por petición.
- 10 MiB por imagen.
- 20 MiB en total.
- 90 segundos de timeout del proveedor.
- Las copias binarias exactas solo se analizan una vez.

## Modelo y secretos

El modelo predeterminado es `gemini-3.1-pro-preview`, configurable mediante
`GEMINI_MODEL`. La clave `GEMINI_API_KEY` existe únicamente como secreto de la
Edge Function y nunca usa el prefijo `VITE_`.

El proveedor queda encapsulado en `gemini-engine.ts`, de modo que las
evaluaciones futuras pueden sustituirlo sin cambiar los contratos ni la UI.

## Despliegue

La función requiere estos secretos del entorno de Supabase:

- `SUPABASE_URL`;
- `SUPABASE_ANON_KEY`;
- `GEMINI_API_KEY`;
- `GEMINI_MODEL` opcional.

`supabase/config.toml` mantiene `verify_jwt = true`. Aunque la aplicación aún no
tiene UI de autenticación, el motor nace cerrado a llamadas anónimas; se
conectará al frontend cuando exista una sesión segura.
