# Reporte de análisis estructural

- Herramienta: @prototipo/motor 0.1.0
- Archivos analizados: 6
- Clases (tipos de nivel superior): 6
- Aristas entre clases: 8
- Recomendaciones: 2
- Paquetes: 3 (aristas entre paquetes: 4)

## Recomendaciones

Recomendaciones: 2 (más 0 de reglas de comparación).

| Regla | Nombre | Recomendaciones |
|---|---|---|
| R1 | Ciclo de dependencias entre paquetes | 1 |
| R1 | Ciclo de dependencias entre clases | 1 |

### 1. [R1] Ciclo de dependencias entre paquetes: app, dominio, util

- **Ubicación:** src/app/Aplicacion.java:6, src/app/RepositorioPedidos.java:6, src/dominio/Pedido.java:7, src/util/Formatos.java:3
- **Problema:** Los paquetes app, dominio, util dependen unos de otros de forma circular: no forman capas y un cambio en cualquiera puede afectar a todos.

| Métrica | Valor medido | Condición | Fuente del umbral |
|---|---|---|---|
| Paquetes en el componente fuertemente conexo | 3 | > 1 | Principio de Dependencias Acíclicas (Martin, 1996, C++ Report 8(10)); Lakos (1996) |

**Refactorización sugerida:**

- Invertir la dependencia (Principio de Inversión de Dependencias): extraer una interfaz (Extract Interface) con lo que una clase usa de la otra y hacer que dependa de la interfaz.
- Mover la lógica compartida a una clase o paquete nuevo del que dependan ambos (Extract Class / Move Method).
- Si la dependencia solo sirve para navegar a otro objeto (getters), pasar ese objeto como parámetro en lugar de guardarlo.

**Detalles:**

- Ciclo: app → dominio → app
- Ciclo: app → util → dominio → app
- Dependencias sugeridas para empezar (las de menor peso, 1): app → util (Aplicacion → Formatos); dominio → app (Pedido → Aplicacion); util → dominio (Formatos → Cliente).

### 2. [R1] Ciclo de dependencias entre clases: app.Aplicacion, dominio.Pedido

- **Ubicación:** src/app/Aplicacion.java:6, src/dominio/Pedido.java:7
- **Problema:** Las clases Aplicacion, Pedido dependen unas de otras de forma circular: no se pueden entender, probar ni reutilizar por separado.

| Métrica | Valor medido | Condición | Fuente del umbral |
|---|---|---|---|
| Clases en el componente fuertemente conexo | 2 | > 1 | Principio de Dependencias Acíclicas (Martin, 1996, C++ Report 8(10)); Lakos (1996) |

**Refactorización sugerida:**

- Invertir la dependencia (Principio de Inversión de Dependencias): extraer una interfaz (Extract Interface) con lo que una clase usa de la otra y hacer que dependa de la interfaz.
- Mover la lógica compartida a una clase o paquete nuevo del que dependan ambos (Extract Class / Move Method).
- Si la dependencia solo sirve para navegar a otro objeto (getters), pasar ese objeto como parámetro en lugar de guardarlo.

**Detalles:**

- Ciclo: Aplicacion → Pedido → Aplicacion
- Dependencias sugeridas para empezar (las de menos usos en el código, 1): Pedido → Aplicacion (estatico línea 20).

## Umbrales usados

| Regla | Activa | Umbral | Valor | Fuente |
|---|---|---|---|---|
| R1 | sí | tamanoCFC | 1 | Principio de Dependencias Acíclicas (Martin, 1996, C++ Report 8(10)); Lakos (1996) |
| R2 | sí | cc | 10 | McCabe (1976) |
| R3 | sí | wmc | 34 | Filó, Bigonha y Ferreira (2015), Tabla I, rango Bad/Uncommon |
| R3 | sí | lcomHS | 0.725 | Filó, Bigonha y Ferreira (2015), Tabla I, rango Bad/Uncommon |
| R3-A | sí | wmc | 47 | Lanza y Marinescu (2006), estrategia God Class, p. 80 (umbrales vía PMD GodClassRule), VERY HIGH |
| R3-A | sí | atfd | 5 | Lanza y Marinescu (2006), estrategia God Class, p. 80 (umbrales vía PMD GodClassRule), FEW |
| R3-A | sí | tcc | 0.333 | Lanza y Marinescu (2006), estrategia God Class, p. 80 (umbrales vía PMD GodClassRule), ONE THIRD |
| R4 | sí | fanIn | 20 | Ferreira et al. (2012), Tabla 3, rango bad |

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
