# Importación de listas desde imágenes — Fase 4

## Cantidades y unidades

La normalización incorpora un extractor determinista en español. Reconoce:

- masas: kg, g y variantes escritas;
- volúmenes: l, ml y variantes;
- unidades contables;
- paquetes, cajas, botellas, latas, bolsas, bandejas, tarros y docenas;
- abreviaturas habituales y plurales;
- decimales con coma o punto.

Una cifra inicial delante de un producto (`2 leche`, `12 huevos`, `2x coca
cola`) se interpreta como recuento de unidades. Si no aparece ninguna cantidad
ni presentación (`pollo`), ambos valores permanecen en `null`.

## Evidencia y conflictos

El extractor conserva el fragmento exacto que originó la cantidad. Su resultado
se compara con la interpretación del modelo:

- si coinciden, se utiliza la lectura determinista;
- si difieren, prevalece la evidencia determinista pero el elemento pasa a
  revisión;
- el conflicto reduce la confianza y añade una razón tipada.

No se descarta silenciosamente la propuesta del modelo: el texto original
permanece disponible para la futura interfaz de revisión.

## Precios

En documentos clasificados como tickets, una cifra decimal de dos posiciones al
final de la línea se separa primero como precio. No participa en la extracción
de cantidad.

```text
LECHE ENTERA 1L    1,25
→ cantidad: 1
→ unidad: l
→ precio detectado: 1,25
```

Si el modelo utilizó `1,25` como cantidad, el motor la elimina, marca
`price_quantity_conflict` y exige revisión.
