# Evidencia del paso 4: reglas y recomendaciones trazables

Fecha de generación: 2026-10-21. Motor `@prototipo/motor` 0.1.0. Umbrales: `docs/umbrales.md` (aprobados el 2026-10-19).

## Contenido

| Archivo | Qué es |
|---|---|
| `pruebas-vitest.txt` | Reporte detallado de las 74 pruebas (todas pasan): 60 de los pasos 2 y 3 y 14 nuevas de reglas. |
| `sistema-monolitico/reporte.md` | Recomendaciones con los umbrales aprobados, más grafo y métricas. |
| `sistema-monolitico/resultado.json` | Salida completa: `recomendaciones[]` y `configuracion` (umbrales y fuentes usados). |
| `sistema-monolitico/reporte-cc5.md` | Misma corrida con `umbrales-ejemplo-cc5.json` (CC > 5) para mostrar que los umbrales son configurables. |
| `resolucion-paquetes/…` | Recomendaciones del fixture de varios paquetes. |

## Resultado sobre el caso de prueba (umbrales aprobados)

| Problema sembrado (`caso-prueba-esperado.md`) | Regla | Recomendación generada | Métrica = valor medido (condición) | Refactorización sugerida |
|---|---|---|---|---|
| 1. Ciclo {Pedido, Inventario, Notificacion} | R1 | Sí | Clases en el CFC = 3 (> 1) | Invertir la dependencia con una interfaz; mover la lógica compartida; no guardar referencias que solo sirven para navegar |
| 2. `procesarSolicitud` compleja | R2 | Sí | CC = 27 (> 10) | Extract Method; Decompose Conditional; Replace Conditional with Polymorphism |
| 3. God Class `SistemaMonolitico` | R3 | Sí | WMC = 41 (> 34) ∧ LCOM-HS = 0.867 (> 0.725) | Extract Class; Move Method/Field; Extract Method |
| (comparación) God Class canónica | R3-A | No | WMC = 41 (≥ 47 ✗), ATFD = 2 (> 5 ✗), TCC = 0.533 (< 0.333 ✗) | — |
| (ninguno) | R4 | No | Fan-in máximo = 3 (> 20 ✗) | — |

Exhaustividad sobre el caso de prueba: 3 de 3 problemas detectados, sin recomendaciones adicionales. **No es una evaluación válida de la herramienta**, porque los problemas los sembró el autor y los umbrales son genéricos. La evaluación real es la del paso 5 (`docs/evaluacion.md`).

La recomendación R3 incluye además el uso de atributos por método y señala que `inventarioService` solo se usa en el constructor. Esto coincide con la observación de `caso-prueba-esperado.md`.

## Comprobación de que las pruebas detectan errores (mutación manual)

Se cambió en el código el umbral por defecto de LCOM-HS de 0.725 a 0.9. **3 pruebas fallaron** (la God Class deja de detectarse). Al restaurarlo, las 74 pasaron.

## Cómo reproducir

```bash
npm run build
npm test
node packages/motor/dist/cli.js analizar tests/fixtures/sistema-monolitico --md reporte.md
node packages/motor/dist/cli.js analizar tests/fixtures/sistema-monolitico --umbrales docs/evidencia/paso-4/umbrales-ejemplo-cc5.json --md reporte-cc5.md
```
