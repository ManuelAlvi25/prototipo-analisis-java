# Evidencia del paso 3: métricas por método y por clase

Fecha de generación: 2026-10-19. Motor `@prototipo/motor` 0.1.0 (web-tree-sitter 0.27.1, tree-sitter-java 0.23.5, Node 24.22.0).

## Contenido

| Archivo | Qué es |
|---|---|
| `pruebas-vitest.txt` | Reporte detallado de las 60 pruebas automáticas (todas pasan): 31 del paso 2 y 29 nuevas de métricas. |
| `sistema-monolitico/reporte.md` | Grafo, ciclos, métricas por clase y CC por método del caso de prueba del cap. 8. |
| `sistema-monolitico/resultado.json` | Salida completa del motor, con las métricas en `clases[].metricas`. |
| `resolucion-paquetes/…` | Lo mismo para el fixture sintético de varios paquetes. |

## Comparación con los valores esperados (`docs/caso-prueba-esperado.md`)

### Complejidad ciclomática por método

| Método | Esperado | Obtenido | ¿Coincide? |
|---|---|---|---|
| SistemaMonolitico.procesarSolicitud | 27 | 27 | Sí |
| SistemaMonolitico.autenticar | 6 | 6 | Sí |
| InventarioService.reservar | 3 | 3 | Sí |
| SistemaMonolitico.exportarAuditoria | 3 | 3 | Sí |
| SistemaMonolitico.generarFactura | 2 | 2 | Sí |
| PedidoService.prepararPedido | 2 | 2 | Sí |
| PedidoService(boolean) | 2 | 2 | Sí |
| Constructores restantes, getters y Main.main | 1 | 1 (los 14) | Sí |

### Métricas por clase

| Clase | WMC (esp./obt.) | Fan-out | Fan-in | CBO | LCOM-HS (esp./obt.) | ¿Coincide? |
|---|---|---|---|---|---|---|
| SistemaMonolitico | 41 / 41 | 3 / 3 | 1 / 1 | 4 / 4 | 0.87 / 0.8667 | Sí |
| PedidoService | 6 / 6 | 1 / 1 | 3 / 3 | 3 / 3 | 0.00 / 0 | Sí |
| InventarioService | 6 / 6 | 2 / 2 | 3 / 3 | 3 / 3 | 0.83 / 0.8333 | Sí |
| NotificacionService | 5 / 5 | 2 / 2 | 2 / 2 | 3 / 3 | 1.00 / 1 | Sí |
| Main | 1 / 1 | 1 / 1 | 0 / 0 | 1 / 1 | n/a / n/a | Sí |

Otras variantes de LCOM para `SistemaMonolitico`: CK esperado 0, obtenido 0; LCOM4 esperado 1, obtenido 1. Coinciden.

### Valores que no estaban en el documento

Los calculó a mano el asistente y falta que los verifique el autor:
- `SistemaMonolitico`: TCC = 8/15 ≈ 0.53 y ATFD = 2 (`pedidoService.getInventarioService()` e `inventarioService.getNotificacionService()`, en el constructor).
- Consecuencia: la regla A (Marinescu canónica: WMC ≥ 47 ∧ ATFD > 5 ∧ TCC < 1/3) **no** detecta la God Class sembrada. No se cumple ninguna de las tres condiciones.

## Comprobación de que las pruebas detectan errores (mutación manual)

Se quitó a propósito el conteo de `ternary_expression` en `miembros.ts`. Resultado: **4 pruebas fallaron** (CC de `procesarSolicitud` y de `generarFactura`, WMC de `SistemaMonolitico` y la prueba unitaria de CC). Al restaurar el código, las 60 volvieron a pasar. Esto muestra que las pruebas no son vacías.

## Cómo reproducir

```bash
npm run build
npm test
node packages/motor/dist/cli.js analizar tests/fixtures/sistema-monolitico --md docs/evidencia/paso-3/sistema-monolitico/reporte.md --json docs/evidencia/paso-3/sistema-monolitico/resultado.json
```
