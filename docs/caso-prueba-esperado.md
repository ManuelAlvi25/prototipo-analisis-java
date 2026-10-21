# Resultados esperados del caso de prueba `sistema-monolitico`

Verificados a mano sobre los 5 archivos de `tests/fixtures/sistema-monolitico/src/deuda/`. Convenciones: constructores incluidos en WMC y excluidos de LCOM; CC = 1 + if, for, while, do, case, catch, ternario, && y || (el `default` no cuenta). La CC de `procesarSolicitud` se contó a mano y también con un script de verificación: ambas dan 27.

## Grafo de dependencias entre clases (un solo paquete: `deuda`)

| Clase | Depende de (fan-out) | Dependen de ella (fan-in) |
|---|---|---|
| Main | SistemaMonolitico | (ninguna) |
| SistemaMonolitico | PedidoService, InventarioService, NotificacionService | Main |
| PedidoService | InventarioService | SistemaMonolitico, InventarioService, NotificacionService |
| InventarioService | PedidoService, NotificacionService | SistemaMonolitico, PedidoService, NotificacionService |
| NotificacionService | InventarioService, PedidoService | SistemaMonolitico, InventarioService |

Los tipos de `java.util` (List, ArrayList) son externos al proyecto y no cuentan como nodos.

## Problema 1: ciclos de dependencia
- Un componente fuertemente conexo: {PedidoService, InventarioService, NotificacionService}.
- Ciclos elementales (3): Pedido→Inventario→Pedido, Inventario→Notificacion→Inventario, Pedido→Inventario→Notificacion→Pedido.
- Recomendación esperada: romper el ciclo (introducir una interfaz o inversión de dependencias, o mover la lógica compartida).

## Problema 2: complejidad ciclomática
| Método | CC |
|---|---|
| SistemaMonolitico.procesarSolicitud | 27 |
| SistemaMonolitico.autenticar | 6 |
| InventarioService.reservar | 3 |
| SistemaMonolitico.exportarAuditoria | 3 |
| SistemaMonolitico.generarFactura | 2 |
| PedidoService.prepararPedido | 2 |
| PedidoService(boolean) | 2 |
| Constructores restantes, getters y Main.main | 1 |

Con el umbral de McCabe (CC > 10) solo se señala `procesarSolicitud`. Recomendación esperada: Extract Method / descomponer.

## Problema 3: God Class (`SistemaMonolitico`)
Responsabilidades mezcladas: solicitudes, autenticación, facturación y auditoría.

| Clase | WMC | Fan-out | Fan-in | CBO (entrantes ∪ salientes) | LCOM-HS |
|---|---|---|---|---|---|
| SistemaMonolitico | 41 | 3 | 1 | 4 | 0.87 |
| PedidoService | 6 | 1 | 3 | 3 | 0.00 |
| InventarioService | 6 | 2 | 3 | 3 | 0.83 |
| NotificacionService | 5 | 2 | 2 | 3 | 1.00 |
| Main | 1 | 1 | 0 | 1 | n/a (sin atributos) |

Otras variantes de LCOM para `SistemaMonolitico`: Chidamber-Kemerer (P−Q) = 0; LCOM4 (componentes conexos) = 1. Ninguna de las dos lo detecta.

Observaciones que afectan el diseño de las reglas:
- Ninguna métrica sola aísla a `SistemaMonolitico`. El CBO difiere por 1 entre clases, y LCOM-HS marca también a `NotificacionService` e `InventarioService` (por métodos que no usan atributos y por getters).
- Lo que sí lo distingue es la combinación: WMC mucho mayor que el resto (41 contra 1 a 6) más cohesión baja más fan-out relativo de 3 de las 4 clases restantes (75%).
- `SistemaMonolitico.inventarioService` solo se asigna en el constructor y nunca se usa.
