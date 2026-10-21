# Reporte de dependencias y ciclos

- Herramienta: @prototipo/motor 0.1.0
- Archivos analizados: 6
- Clases (tipos de nivel superior): 6
- Aristas entre clases: 8
- Paquetes: 3 (aristas entre paquetes: 4)

## Grafo de dependencias entre clases

| Clase | Depende de (fan-out) | Dependen de ella (fan-in) | Fan-out | Fan-in |
|---|---|---|---|---|
| Aplicacion | Cliente, Pedido, Formatos | Pedido | 3 | 1 |
| RepositorioPedidos | Pedido, Repositorio | (ninguna) | 2 | 0 |
| Cliente | (ninguna) | Aplicacion, Pedido, Formatos | 0 | 3 |
| Pedido | Aplicacion, Cliente | Aplicacion, RepositorioPedidos | 2 | 2 |
| Repositorio | (ninguna) | RepositorioPedidos | 0 | 1 |
| Formatos | Cliente | Aplicacion | 1 | 1 |

## Evidencia de cada arista

| Origen | Destino | Usos (línea) |
|---|---|---|
| Aplicacion | Cliente | new (10) |
| Aplicacion | Pedido | campo (7), parametro (15) |
| Aplicacion | Formatos | import-estatico (4) |
| RepositorioPedidos | Pedido | generico (6), retorno (8) |
| RepositorioPedidos | Repositorio | implements (6) |
| Pedido | Aplicacion | estatico (20) |
| Pedido | Cliente | campo (9) |
| Formatos | Cliente | retorno (11), new (12) |

## Ciclos entre clases

Componentes fuertemente conexos (tamaño > 1): 1

1. {Aplicacion, Pedido}

Ciclos elementales: 1

1. Aplicacion → Pedido → Aplicacion

## Ciclos entre paquetes

Componentes fuertemente conexos (tamaño > 1): 1

1. {app, dominio, util}

Ciclos elementales: 2

1. app → dominio → app
2. app → util → dominio → app
