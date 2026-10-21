# Reporte de dependencias y ciclos

- Herramienta: @prototipo/motor 0.1.0
- Archivos analizados: 5
- Clases (tipos de nivel superior): 5
- Aristas entre clases: 9
- Paquetes: 1 (aristas entre paquetes: 0)

## Grafo de dependencias entre clases

| Clase | Depende de (fan-out) | Dependen de ella (fan-in) | Fan-out | Fan-in |
|---|---|---|---|---|
| InventarioService | NotificacionService, PedidoService | NotificacionService, PedidoService, SistemaMonolitico | 2 | 3 |
| Main | SistemaMonolitico | (ninguna) | 1 | 0 |
| NotificacionService | InventarioService, PedidoService | InventarioService, SistemaMonolitico | 2 | 2 |
| PedidoService | InventarioService | InventarioService, NotificacionService, SistemaMonolitico | 1 | 3 |
| SistemaMonolitico | InventarioService, NotificacionService, PedidoService | Main | 3 | 1 |

## Evidencia de cada arista

| Origen | Destino | Usos (línea) |
|---|---|---|
| InventarioService | NotificacionService | campo (5), new (10), retorno (30) |
| InventarioService | PedidoService | campo (4), parametro (8), retorno (26) |
| Main | SistemaMonolitico | new (5), variable (5) |
| NotificacionService | InventarioService | campo (4), parametro (7), retorno (20) |
| NotificacionService | PedidoService | campo (5), parametro (7), retorno (16), new (17), retorno (24) |
| PedidoService | InventarioService | campo (4), new (12), retorno (23) |
| SistemaMonolitico | InventarioService | campo (8) |
| SistemaMonolitico | NotificacionService | campo (9) |
| SistemaMonolitico | PedidoService | campo (7), new (15) |

## Ciclos entre clases

Componentes fuertemente conexos (tamaño > 1): 1

1. {InventarioService, NotificacionService, PedidoService}

Ciclos elementales: 3

1. InventarioService → NotificacionService → InventarioService
2. InventarioService → PedidoService → InventarioService
3. InventarioService → NotificacionService → PedidoService → InventarioService

## Ciclos entre paquetes

Componentes fuertemente conexos (tamaño > 1): 0

Ciclos elementales: 0
