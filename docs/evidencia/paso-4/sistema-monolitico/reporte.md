# Reporte de análisis estructural

- Herramienta: @prototipo/motor 0.1.0
- Archivos analizados: 5
- Clases (tipos de nivel superior): 5
- Aristas entre clases: 9
- Recomendaciones: 3
- Paquetes: 1 (aristas entre paquetes: 0)

## Recomendaciones

Recomendaciones: 3 (más 0 de reglas de comparación).

| Regla | Nombre | Recomendaciones |
|---|---|---|
| R1 | Ciclo de dependencias entre clases | 1 |
| R2 | Método complejo | 1 |
| R3 | God Class | 1 |

### 1. [R1] Ciclo de dependencias entre clases: deuda.InventarioService, deuda.NotificacionService, deuda.PedidoService

- **Ubicación:** src/deuda/InventarioService.java:3, src/deuda/NotificacionService.java:3, src/deuda/PedidoService.java:3
- **Problema:** Las clases InventarioService, NotificacionService, PedidoService dependen unas de otras de forma circular: no se pueden entender, probar ni reutilizar por separado.

| Métrica | Valor medido | Condición | Fuente del umbral |
|---|---|---|---|
| Clases en el componente fuertemente conexo | 3 | > 1 | Principio de Dependencias Acíclicas (Martin, 1996, C++ Report 8(10)); Lakos (1996) |

**Refactorización sugerida:**

- Invertir la dependencia (Principio de Inversión de Dependencias): extraer una interfaz (Extract Interface) con lo que una clase usa de la otra y hacer que dependa de la interfaz.
- Mover la lógica compartida a una clase o paquete nuevo del que dependan ambos (Extract Class / Move Method).
- Si la dependencia solo sirve para navegar a otro objeto (getters), pasar ese objeto como parámetro en lugar de guardarlo.

**Detalles:**

- Ciclo: InventarioService → NotificacionService → InventarioService
- Ciclo: InventarioService → PedidoService → InventarioService
- Ciclo: InventarioService → NotificacionService → PedidoService → InventarioService
- Dependencias sugeridas para empezar (las de menos usos en el código, 3): InventarioService → NotificacionService (campo línea 5, new línea 10, retorno línea 30); InventarioService → PedidoService (campo línea 4, parametro línea 8, retorno línea 26); NotificacionService → InventarioService (campo línea 4, parametro línea 7, retorno línea 20); PedidoService → InventarioService (campo línea 4, new línea 12, retorno línea 23).

### 2. [R2] Método complejo: deuda.SistemaMonolitico.procesarSolicitud(String, String, int, int)

- **Ubicación:** src/deuda/SistemaMonolitico.java:20
- **Problema:** El método SistemaMonolitico.procesarSolicitud(String, String, int, int) tiene 27 caminos independientes: es difícil de entender y requiere al menos ese número de casos de prueba para cubrirlo.

| Métrica | Valor medido | Condición | Fuente del umbral |
|---|---|---|---|
| Complejidad ciclomática (CC) | 27 | > 10 | McCabe (1976) |

**Refactorización sugerida:**

- Extract Method: separar en métodos propios los bloques que tienen una responsabilidad identificable.
- Decompose Conditional / Consolidate Conditional Expression: simplificar condiciones compuestas.
- Replace Conditional with Polymorphism: si un switch o cadena de if elige comportamiento según un tipo.

### 3. [R3] God Class: deuda.SistemaMonolitico

- **Ubicación:** src/deuda/SistemaMonolitico.java:6
- **Problema:** La clase SistemaMonolitico concentra mucha lógica (WMC 41) y sus métodos comparten pocos datos: probablemente mezcla varias responsabilidades.

| Métrica | Valor medido | Condición | Fuente del umbral |
|---|---|---|---|
| Weighted Methods per Class (WMC) | 41 | > 34 | Filó, Bigonha y Ferreira (2015), Tabla I, rango Bad/Uncommon |
| Falta de cohesión (LCOM de Henderson-Sellers) | 0.867 | > 0.725 | Filó, Bigonha y Ferreira (2015), Tabla I, rango Bad/Uncommon |

**Refactorización sugerida:**

- Extract Class: separar en clases nuevas los grupos de métodos y atributos que atienden responsabilidades distintas (ver qué atributos usa cada método).
- Move Method / Move Field: llevar a otras clases el comportamiento que trabaja sobre sus datos.
- Extract Method en los métodos más complejos antes de repartirlos.

**Detalles:**

- procesarSolicitud(String, String, int, int) usa: auditoria, caja, notificacionService, pedidoService, usuarioActual
- autenticar(String, String) usa: caja
- generarFactura(String, double, boolean) usa: caja
- exportarAuditoria(String) usa: auditoria
- getCaja() usa: caja
- getUsuarioActual() usa: usuarioActual
- Atributos que solo usan los constructores: inventarioService.

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
| InventarioService | 6 | 4 | 3 | 2 | 3 | 3 | 0 | 0.333 | 1 | 2 | 0.833 |
| Main | 1 | 1 | 0 | 1 | 0 | 1 | 0 | n/a | 0 | 1 | n/a |
| NotificacionService | 5 | 5 | 2 | 2 | 2 | 3 | 0 | 0 | 6 | 4 | 1 |
| PedidoService | 6 | 4 | 1 | 1 | 3 | 3 | 0 | 1 | 0 | 1 | 0 |
| SistemaMonolitico | 41 | 7 | 6 | 3 | 1 | 4 | 2 | 0.533 | 0 | 1 | 0.867 |

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
