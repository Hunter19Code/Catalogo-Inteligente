# Importación de listas desde imágenes — Fase 3

## Interpretación conservadora

La salida validada del modelo pasa ahora por una segunda capa determinista antes
de mostrarse o persistirse. Esta capa:

- compara cada palabra del nombre propuesto con el texto original;
- admite coincidencias literales, abreviaturas por prefijo y errores OCR de una
  edición;
- trata sustituciones frecuentes como `lech3` → `Leche`;
- penaliza palabras del nombre que no tengan apoyo en la imagen;
- conserva cantidades y unidades exactamente como llegaron validadas;
- nunca aplica cantidades, unidades, marcas o presentaciones por defecto.

## Fallback antiinvención

Si menos del 72 % del nombre propuesto está respaldado por el texto, se descarta
la interpretación enriquecida y se recupera un nombre literal. Solo se eliminan
patrones inequívocos de cantidad, unidad o precio.

Ejemplo:

```text
Original: pollo
Propuesta: Pechuga de pollo
Resultado: Pollo (requiere revisión)
```

El resultado dudoso no se elimina: permanece reversible y visible para una
revisión posterior.

## Confianza

La confianza normalizada combina:

- 30 % de confianza declarada por el modelo;
- 30 % de legibilidad de la línea y calidad global de la imagen;
- 40 % de respaldo textual de la interpretación;
- penalización por cada ambigüedad declarada.

Los casos que no alcancen nivel alto, utilicen fallback o contengan
ambigüedades quedan en `needs_review`. Un porcentaje alto del proveedor no
puede convertir por sí solo una imagen mala en un resultado de alta confianza.

## Integración

La Edge Function devuelve:

- `analysis`: evidencia e interpretación originales validadas;
- `products`: productos normalizados y puntuados;
- `sources`: hashes y metadatos no sensibles de las imágenes.

No se escribe nada en la base de datos y la introducción manual sigue sin
cambios.
