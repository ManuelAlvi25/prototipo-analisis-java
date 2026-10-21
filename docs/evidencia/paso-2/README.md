# Evidencia del paso 2: grafo de dependencias y detección de ciclos

Fecha de generación: 2026-10-19. Motor `@prototipo/motor` 0.1.0 (web-tree-sitter 0.27.1, tree-sitter-java 0.23.5, Node 24.22.0).

## Contenido

| Archivo | Qué es |
|---|---|
| `pruebas-vitest.txt` | Reporte detallado de las 31 pruebas automáticas (todas pasan). |
| `sistema-monolitico/reporte.md` | Tabla de fan-in/fan-out, evidencia por arista, componentes fuertemente conexos y ciclos del caso de prueba del cap. 8. |
| `sistema-monolitico/resultado.json` | Salida completa del motor (entrada para los pasos siguientes). |
| `sistema-monolitico/grafo-clases.mmd` | Grafo en Mermaid; los nodos y aristas del ciclo van en rojo. |
| `sistema-monolitico/grafo-clases.dot` | El mismo grafo en Graphviz DOT, agrupado por paquete. |
| `resolucion-paquetes/…` | Lo mismo para el fixture sintético de varios paquetes (ciclos entre paquetes y casos de resolución de nombres). |

## Comparación con los valores esperados (`docs/caso-prueba-esperado.md`)

| Elemento | Esperado (a mano) | Obtenido (motor) | ¿Coincide? |
|---|---|---|---|
| Clases del proyecto | 5 (List y ArrayList excluidas) | 5 | Sí |
| Fan-out / fan-in de las 5 clases | tabla del documento | idéntica (ver `reporte.md`) | Sí |
| Aristas | 9 | 9 | Sí |
| Componentes fuertemente conexos | 1: {Pedido, Inventario, Notificacion} | 1: {Inventario, Notificacion, Pedido} | Sí |
| Ciclos elementales | 3 | 3 | Sí |

Nota: el motor normaliza cada ciclo para que empiece en el nodo de menor nombre. Por eso el ciclo `Pedido→Inventario→Notificacion→Pedido` del documento aparece como `Inventario→Notificacion→Pedido→Inventario`: es el mismo ciclo rotado.

## Cómo reproducir

Desde la raíz del prototipo:

```bash
npm install
npm run build
npm test
node packages/motor/dist/cli.js analizar tests/fixtures/sistema-monolitico --md docs/evidencia/paso-2/sistema-monolitico/reporte.md --json docs/evidencia/paso-2/sistema-monolitico/resultado.json --dot docs/evidencia/paso-2/sistema-monolitico/grafo-clases.dot --mermaid docs/evidencia/paso-2/sistema-monolitico/grafo-clases.mmd
```

Para pasar los diagramas a imagen: los `.mmd` se ven en VS Code (con la extensión Markdown Preview Mermaid) o en https://mermaid.live, y los `.dot` se convierten con Graphviz (`dot -Tsvg grafo-clases.dot -o grafo-clases.svg`). Graphviz no está instalado en esta máquina.
