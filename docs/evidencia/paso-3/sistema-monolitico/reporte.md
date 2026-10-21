# Reporte de análisis estructural

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

## Métricas por clase

| Clase | WMC | Métodos | Atributos | Fan-out | Fan-in | CBO | ATFD | TCC | LCOM-CK | LCOM4 | LCOM-HS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| InventarioService | 6 | 4 | 3 | 2 | 3 | 3 | 0 | 0.33 | 1 | 2 | 0.83 |
| Main | 1 | 1 | 0 | 1 | 0 | 1 | 0 | n/a | 0 | 1 | n/a |
| NotificacionService | 5 | 5 | 2 | 2 | 2 | 3 | 0 | 0 | 6 | 4 | 1 |
| PedidoService | 6 | 4 | 1 | 1 | 3 | 3 | 0 | 1 | 0 | 1 | 0 |
| SistemaMonolitico | 41 | 7 | 6 | 3 | 1 | 4 | 2 | 0.53 | 0 | 1 | 0.87 |

## Complejidad ciclomática por método (de mayor a menor)

| Clase | Método | Línea | CC |
|---|---|---|---|
| SistemaMonolitico | procesarSolicitud(String, String, int, int) | 20 | 27 |
| SistemaMonolitico | autenticar(String, String) | 88 | 6 |
| InventarioService | reservar(String, int) | 13 | 3 |
| SistemaMonolitico | exportarAuditoria(String) | 105 | 3 |
| PedidoService | PedidoService(boolean) | 10 | 2 |
| PedidoService | prepararPedido(String, int) | 16 | 2 |
| SistemaMonolitico | generarFactura(String, double, boolean) | 99 | 2 |
| InventarioService | InventarioService(PedidoService) | 8 | 1 |
| InventarioService | getNotificacionService() | 30 | 1 |
| InventarioService | getPedidoService() | 26 | 1 |
| Main | main(String[]) | 4 | 1 |
| NotificacionService | NotificacionService(InventarioService, PedidoService) | 7 | 1 |
| NotificacionService | crearPedidoAlternativo() | 16 | 1 |
| NotificacionService | getInventarioService() | 20 | 1 |
| NotificacionService | getPedidoService() | 24 | 1 |
| NotificacionService | notificar(String) | 12 | 1 |
| PedidoService | PedidoService() | 6 | 1 |
| PedidoService | getInventarioService() | 23 | 1 |
| SistemaMonolitico | SistemaMonolitico() | 14 | 1 |
| SistemaMonolitico | getCaja() | 115 | 1 |
| SistemaMonolitico | getUsuarioActual() | 119 | 1 |
