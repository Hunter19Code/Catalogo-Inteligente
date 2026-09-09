# Importación de listas desde imágenes — Fase 1

## Decisión de arquitectura

El análisis de una imagen no escribe directamente en `productos`. Sus datos pasan
por cuatro representaciones independientes:

1. **Evidencia original** (`SourceEvidence`): texto literal, imagen y posición,
   legibilidad y posible tachado.
2. **Interpretación de IA** (`AIImageItem`): significado propuesto, cantidad,
   unidad, precio separado y ambigüedades.
3. **Producto normalizado** (`NormalizedDetectedProduct`): resultado de reglas
   deterministas, coincidencias con el catálogo y confianza combinada.
4. **Elemento final** (`ReviewedShoppingListItem`): valores editados y
   confirmados expresamente por el usuario.

Solo la cuarta representación puede llegar a la capa de persistencia. La
integración con la base de datos se añadirá después de implementar el motor y la
revisión; esta fase no altera las tablas ni el flujo manual existente.

## Contrato de IA

`AIImageAnalysisResponseSchema` es la frontera con cualquier proveedor. Exige:

- versión literal del esquema;
- clasificación y calidad del documento;
- un máximo de 200 elementos;
- propiedades conocidas únicamente (`strict`);
- texto original conservado;
- cantidades y unidades acompañadas por evidencia textual;
- precios separados de cantidades;
- categorías limitadas a los identificadores enviados en la petición;
- regiones normalizadas entre 0 y 1;
- exclusión obligatoria de tachados claros;
- revisión obligatoria de posibles tachados;
- cero productos para imágenes ilegibles o que no sean listas.

`parseAIImageAnalysis` acepta objetos o JSON y añade validaciones dependientes de
la petición: número real de imágenes y categorías permitidas. Una respuesta que
no supere ambas capas se rechaza completa y nunca continúa al guardado.

## Unidades

Las unidades normalizadas forman un vocabulario cerrado. `unitText` conserva la
grafía original. Cuando una unidad escrita no pertenece al vocabulario,
`unit` queda en `null` y no se inventa una equivalencia.

Si no aparece cantidad o unidad, todos sus valores quedan en `null` y
`explicit` es `false`. El comportamiento por defecto de la aplicación se
aplicará únicamente después, sin atribuírselo a la imagen.

## Coincidencias y confianza

Una coincidencia de catálogo puede ser:

- `none`;
- `unique`, único caso que permite una preselección;
- `ambiguous`, que conserva todos los candidatos sin elegir ninguno.

La confianza final no es el porcentaje del modelo. El contrato reserva señales
separadas para calidad del texto, interpretación y catálogo, además de razones
enumeradas y un nivel `high`, `medium` o `low`.

## Persistencia y usuarios

La aplicación actual no tiene listas independientes, autenticación ni
aislamiento multiusuario. Antes de guardar resultados de imagen será necesario
introducir una entidad de lista/elemento y propiedad basada en `auth.uid()`.
Las migraciones deberán mantener el formulario manual operativo y sustituir las
políticas RLS públicas; no se aplican todavía porque hacerlo sin el flujo de
autenticación rompería la aplicación actual.
