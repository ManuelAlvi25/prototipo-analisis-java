# Reporte de análisis estructural

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

## Métricas por clase

| Clase | WMC | Métodos | Atributos | Fan-out | Fan-in | CBO | ATFD | TCC | LCOM-CK | LCOM4 | LCOM-HS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Aplicacion | 2 | 2 | 1 | 3 | 1 | 3 | 0 | 0 | 1 | 2 | 2 |
| RepositorioPedidos | 1 | 1 | 0 | 2 | 0 | 2 | 0 | n/a | 0 | 1 | n/a |
| Cliente | 1 | 1 | 1 | 0 | 3 | 3 | 0 | n/a | 0 | 1 | n/a |
| Pedido | 3 | 2 | 2 | 2 | 2 | 3 | 0 | 0 | 1 | 2 | 2 |
| Repositorio | 1 | 1 | 0 | 0 | 1 | 1 | 0 | n/a | 0 | 1 | n/a |
| Formatos | 3 | 3 | 0 | 1 | 1 | 2 | 0 | 0 | 1 | 2 | n/a |

## Complejidad ciclomática por método (de mayor a menor)

| Clase | Método | Línea | CC |
|---|---|---|---|
| Pedido | mayor(T, T) | 15 | 2 |
| Aplicacion | ejecutar() | 9 | 1 |
| Aplicacion | registrar(Pedido) | 15 | 1 |
| Cliente | getNombre() | 8 | 1 |
| Formatos | Formatos() | 4 | 1 |
| Formatos | clienteVacio() | 11 | 1 |
| Formatos | formatear(String) | 7 | 1 |
| Pedido | confirmar() | 19 | 1 |
| RepositorioPedidos | buscar(String) | 7 | 1 |
| Repositorio | buscar(String) | 4 | 1 |
