# Fixture `resolucion-paquetes`

Fixture sintético (creado durante el paso 2, no forma parte de la comparación del cap. 8) para
cubrir lo que `sistema-monolitico` no cubre: varios paquetes, ciclos entre paquetes y los casos
de resolución de nombres sin tipos.

| Caso | Dónde | Resultado esperado |
|---|---|---|
| Import a demanda `dominio.*` | `Aplicacion` | aristas a `Pedido` (campo) y `Cliente` (new) |
| `var` | `Aplicacion.ejecutar` | no genera referencia a un tipo `var` |
| `import static util.Formatos.formatear` | `Aplicacion` | arista a `Formatos` (import-estatico) |
| `implements Repositorio<Pedido>` | `RepositorioPedidos` | aristas a `Repositorio` (implements) y `Pedido` (generico, retorno) |
| Acceso estático `Aplicacion.registrar(this)` | `Pedido` | arista a `Aplicacion` (estatico) |
| Tipo anidado `Linea` | `Pedido` | autorreferencia, se ignora |
| Parámetro de tipo `<T extends Comparable<T>>` | `Pedido` | `T` no es dependencia; `Comparable` es externo |
| `java.util.List`, `ArrayList` | `Pedido` | externos, no son nodos |
| Import sin usar `util.Formatos` | `Cliente` | NO genera arista |
| Nombre calificado `dominio.Cliente` | `Formatos` | arista a `Cliente` (retorno, new) |

Grafo de clases esperado:

| Clase | Depende de |
|---|---|
| app.Aplicacion | dominio.Cliente, dominio.Pedido, util.Formatos |
| app.RepositorioPedidos | dominio.Pedido, dominio.Repositorio |
| dominio.Cliente | (ninguna) |
| dominio.Pedido | app.Aplicacion, dominio.Cliente |
| dominio.Repositorio | (ninguna) |
| util.Formatos | dominio.Cliente |

- Ciclos de clases: 1 CFC {Aplicacion, Pedido}; 1 ciclo elemental Aplicacion → Pedido → Aplicacion.
- Grafo de paquetes: app→dominio (peso 4), app→util (1), dominio→app (1), util→dominio (1).
- Ciclos de paquetes: 1 CFC {app, dominio, util}; 2 ciclos elementales: app → dominio → app y app → util → dominio → app.
