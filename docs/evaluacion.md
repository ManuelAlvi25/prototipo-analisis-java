# Diseño de la evaluación (paso 5, objetivo específico 5)

Versión 1.0, 2026-10-21. **Se congela antes de ejecutar cualquier análisis.** El SHA-256 de este archivo se guarda en `docs/evidencia/paso-5/congelamiento.txt`. Cualquier cambio posterior va en la sección 11 con fecha, motivo y aclaración de si ya se conocían resultados.

## 1. Preguntas de evaluación

| Id | Pregunta | Medida |
|---|---|---|
| PE1 | ¿Qué proporción de problemas conocidos (sembrados) detecta el prototipo? | Exhaustividad (recall) por regla y total |
| PE2 | ¿Qué proporción de las alertas del prototipo sobre código real son correctas y pertinentes? | Precisión sobre una muestra revisada a mano |
| PE3 | ¿Las mediciones coinciden con las de herramientas establecidas? | Concordancia de CC con Checkstyle; aristas de paquetes con `jdeps` |
| PE4 | ¿Qué detecta el prototipo que no detectan las herramientas analizadas en el cap. 8, y viceversa? | Matriz de detección por problema sembrado y herramienta |
| PE5 | ¿El análisis es lo bastante rápido para usarse en el editor? | Tiempo de análisis (mediana de 3 corridas) |

## 2. Proyectos

Criterios de selección, fijados antes de elegir:
- Java orientado a objetos, de código abierto con licencia OSI.
- Usados ampliamente.
- Tamaños distintos (pequeño, mediano y grande) y dominios distintos.
- Con una versión etiquetada (tag) para que sea reproducible.

| Proyecto | Versión (tag) | Licencia | Dominio | Tamaño del repositorio (GitHub) | Por qué |
|---|---|---|---|---|---|
| jsoup | `jsoup-1.23.2` | MIT | Parser de HTML | ~7.7 MB (pequeño) | Analizador con máquinas de estados: pone a prueba R2 con `switch` grandes, que pueden ser complejidad legítima |
| Apache Commons Lang | `rel/commons-lang-3.21.0` | Apache-2.0 | Biblioteca de utilerías | ~33 MB (mediano) | Muchas clases utilitarias estáticas sin atributos: pone a prueba el comportamiento de LCOM-HS (n/a) y de R4 (fan-in alto en utilerías estables) |
| JFreeChart | `v1.5.6` | LGPL-2.1 | Gráficas | ~31 MB (grande, código más antiguo) | Clases grandes y muchos paquetes: pone a prueba R1 (paquetes), R3 y el rendimiento |

Tags, licencias y tamaños se verificaron con la API de GitHub el 2026-10-21. Al clonar se registran el hash del commit, el número de archivos `.java` y las líneas de código.

**Alcance del análisis:** solo el código de producción (`src/main/java`). Se excluyen pruebas, ejemplos, demos y código generado. La misma exclusión se aplica a todas las herramientas.

## 3. PE1: exhaustividad con problemas sembrados

### 3.1 Principios

- Los problemas se siembran en **copias** de los proyectos. Los originales no se modifican.
- La selección de dónde sembrar es **aleatoria con semilla fija** (`20261021`) sobre listas ordenadas alfabéticamente, con criterios **sintácticos** (imports, campos, número de métodos) que no dependen de las métricas ni de las reglas del prototipo.
- Los tamaños de los problemas sembrados se definen con referencias de la literatura **distintas de los umbrales de las reglas** (por ejemplo, NOM de Lanza y Marinescu para el tamaño de una God Class), para que la siembra no esté hecha a la medida de la regla que la debe detectar.
- Hay una copia sembrada por proyecto y por categoría (ciclos, métodos, God Class): 3 categorías × 3 proyectos = 9 copias. Así una categoría no interfiere con otra.
- Las copias sembradas no necesitan compilar, porque el análisis es sintáctico. Para las herramientas que necesitan bytecode (`jdeps`) solo se usa la versión original.

### 3.2 Lista de problemas sembrados

`{P}` ∈ {`jsoup`, `lang`, `jfc`}. Las instancias concretas (qué clases) se generan con el script de selección y se anotan en el **Anexo B antes** de correr cualquier herramienta sobre las copias sembradas.

| Id | Categoría | Qué se inyecta | Criterio de selección | Detección esperada (prototipo) | ¿Cuenta para la exhaustividad? |
|---|---|---|---|---|---|
| S-{P}-C1 | Ciclo de 2 clases entre paquetes | En la clase A se agrega `private B semC1;` y el import de B | Par (A, B) de paquetes distintos donde B importa A explícitamente y declara un campo de tipo A | Una R1 (clases) cuyo componente contiene A y B, y una R1 (paquetes) que contiene ambos paquetes | Sí |
| S-{P}-C2 | Ciclo de 3 clases | En C se agrega `void semC2(A a) {}` y el import de A | Cadena A→B→C (cada una importa a la siguiente y la usa como tipo de campo o parámetro), en ≥ 2 paquetes | Una R1 (clases) cuyo componente contiene A, B y C | Sí |
| S-{P}-C3 | Ciclo invisible por una limitación declarada | En A se agrega una llamada estática con nombre completamente calificado `pb.B.m()`, sin import | Igual que C1, sobre otro par; B debe tener un método `public static` | **No detectado** (limitación declarada en `arquitectura.md` §6) | No; se reporta aparte como verificación de la limitación |
| S-{P}-M1 | Método complejo, en el borde | Plantilla T11 (CC = 11) | Clase al azar con ≥ 1 método | R2 sobre el método | Sí |
| S-{P}-M2 | Método complejo con sintaxis moderna | Plantilla T15 (CC = 15: `switch` con flechas, lambda, ternario, `&&`/`\|\|`) | Otra clase al azar | R2 sobre el método | Sí |
| S-{P}-M3 | Método muy complejo | Plantilla T30 (CC = 30, anidamiento profundo) | Otra clase al azar | R2 sobre el método | Sí |
| S-{P}-M4 | Control negativo | Plantilla T10 (CC = 10) | Otra clase al azar | **Ninguna** R2 sobre el método | No; mide la especificidad en el borde |
| S-{P}-G1 | God Class por fusión de 3 clases | Clase nueva `SemGod1` con la unión de atributos y métodos de 3 clases (colisiones renombradas con sufijo `_2`, `_3`) | 3 clases de paquetes distintos, sin imports entre ellas, cada una con NOM ≥ 7 (AVG de Lanza y Marinescu 2006 para Java) y ≥ 2 atributos de instancia | R3 sobre `SemGod1` | Sí |
| S-{P}-G2 | God Class por fusión de 2 clases | Igual con 2 clases, cada una con NOM ≥ 10 (HIGH de Lanza y Marinescu) | Igual | R3 sobre `SemGod2` | Sí |

Totales: 7 positivos por proyecto, 21 en total (6 de ciclos, 9 de métodos, 6 de God Class). Además, 3 controles negativos y 3 verificaciones de la limitación.

**Seguimiento de controles:** si en la corrida base (sin siembra) A y B de un ciclo ya están en el mismo componente fuertemente conexo, la siembra no aporta información. Se descarta, se anota en el Anexo B y se toma el siguiente candidato del orden aleatorio. Esta comprobación usa solo la estructura del grafo original, no el resultado sobre la copia sembrada.

### 3.3 Plantillas de métodos (Anexo A)

Las plantillas T10, T11, T15 y T30 se escriben en el Anexo A antes de ejecutar. Para cada una, el autor cuenta la CC **a mano**, punto por punto según la convención de `caso-prueba-esperado.md`, y la verifica con Checkstyle con la configuración alineada (§5). Las plantillas usan solo parámetros y variables locales, para no alterar las métricas de cohesión de la clase anfitriona.

### 3.4 Medidas

- Exhaustividad = sembrados detectados / sembrados, por categoría y total, con intervalo de Wilson al 95 %. Con n = 21 los intervalos son amplios y así se reportará.
- Los falsos positivos en controles negativos se reportan como número (0–3).
- R3-A se evalúa sobre los mismos G1 y G2 como comparación. No suma a la exhaustividad principal.

## 4. PE2: precisión con revisión manual

### 4.1 Muestra

- Se toman las alertas del prototipo sobre las versiones **originales** (sin siembra) de los tres proyectos.
- Para cada regla y proyecto: si hay ≤ 15 alertas se revisan todas; si hay más, se toma una **muestra aleatoria simple de 15** con semilla `20261021` (barajado de Fisher–Yates con el generador mulberry32, sobre las alertas ordenadas por `regla` y `entidad.id`).
- Máximo 15 × 5 reglas × 3 proyectos = 225 revisiones. Las reglas sin alertas se reportan como "sin alertas".

### 4.2 Rúbrica (fijada antes de revisar)

Cada alerta recibe dos juicios.

**(a) Corrección de la medición:** ¿el valor medido es real?

| Regla | Cómo se verifica |
|---|---|
| R1 | Cada dependencia de un ciclo elemental del detalle existe en el código. Para paquetes se contrasta además con `jdeps`. |
| R2 | La CC coincide con Checkstyle alineado. Si difiere, se cuenta a mano. |
| R3 / R3-A | WMC y LCOM-HS recalculados a mano en clases de ≤ 15 métodos; en las demás, revisión de 3 métodos al azar. |
| R4 | Las dependientes listadas usan realmente la clase (se verifica una muestra de 5). |

**(b) Pertinencia:** ¿un desarrollador razonable aceptaría que hay un problema de diseño que justifica la refactorización sugerida? Escala Sí / Discutible / No.

| Regla | Sí | Discutible | No |
|---|---|---|---|
| R1 | El ciclo acopla responsabilidades separables | Ciclo por un patrón deliberado (Visitor, navegación padre-hijo en un árbol) | El ciclo no existe (error de medición) |
| R2 | Hay ≥ 2 bloques extraíbles con propósito propio o anidamiento ≥ 3 | `switch` plano de despacho o máquina de estados donde dividir no simplifica | Código generado o trivial (`equals`, `hashCode`) |
| R3 / R3-A | Se pueden nombrar ≥ 2 responsabilidades atendidas por grupos de métodos distintos | Fachada o coordinador por diseño | Una sola responsabilidad |
| R4 | Clase concreta con API amplia cuyo cambio afectaría a sus dependientes | Utilería estable o clase base del marco | Interfaz, enum, excepción o anotación |

Precisión estricta = Sí / revisadas. Precisión laxa = (Sí + Discutible) / revisadas. Se reporta también la corrección (a) por separado.

### 4.3 Revisores

- El autor revisa toda la muestra. Un segundo revisor (asesor o compañero con experiencia en Java) revisa un 30 % estratificado por regla, sin ver los juicios del autor.
- Acuerdo entre revisores: kappa de Cohen sobre la escala de 3 niveles. Se reportan tanto los juicios del autor como los del segundo revisor.
- Si no hay segundo revisor, se declara como amenaza a la validez.
- Las revisiones se registran en `docs/evidencia/paso-5/revision.csv` con columnas: alerta, juicio (a), juicio (b) y justificación de una línea.

## 5. PE3: concordancia de las mediciones

| Medición | Referencia | Configuración | Medida |
|---|---|---|---|
| CC por método | Checkstyle `CyclomaticComplexity` (versión registrada al ejecutar) | **Alineada:** tokens `LITERAL_WHILE, LITERAL_DO, LITERAL_FOR, LITERAL_IF, LITERAL_CASE, LITERAL_CATCH, QUESTION, LAND, LOR` (sin `LITERAL_SWITCH` ni `LITERAL_WHEN`) y `max = 0`, para que reporte todos los métodos. También la configuración **por defecto**, que cuenta además el `switch`. | % de métodos con CC idéntica, diferencia media y correlación de Spearman; se clasifican las causas de diferencia |
| Aristas entre paquetes | `jdeps` (JDK 25, sobre el bytecode compilado del original) | `jdeps -verbose:package`, solo paquetes del proyecto | Precisión y exhaustividad de las aristas del prototipo respecto a `jdeps` (que sí resuelve tipos) |

Las diferencias esperadas por diseño (tipos inferidos con `var`, llamadas encadenadas, constantes que el compilador sustituye en línea) se clasifican y se cruzan con las limitaciones declaradas.

## 6. PE4: comparación con herramientas (cap. 8)

Se corren sobre las 9 copias sembradas y sobre los originales:

| Herramienta | Reglas que se usan | Equivalente |
|---|---|---|
| Checkstyle | `CyclomaticComplexity` (max 10), `ClassFanOutComplexity`, `ClassDataAbstractionCoupling` | R2; acoplamiento |
| PMD | `GodClass`, `CyclomaticComplexity` (reportLevel 10), `CouplingBetweenObjects` | R3-A, R2, acoplamiento |
| SonarQube Community Build (local en Docker) o, si no se puede, SonarQube for IDE en VS Code | Reglas por defecto del perfil Java (complejidad cognitiva, acoplamiento) | R2 (aproximado), acoplamiento |
| Extension Pack for Java | Diagnósticos del editor | Capacidades (cualitativo) |

Producto principal: la **matriz de detección**, con cada problema sembrado en las filas, cada herramienta en las columnas y celdas Detectado / No detectado / No aplica. Se complementa con la matriz cualitativa de capacidades del cap. 8 (ciclos de clases, ciclos de paquetes, recomendación trazable, umbral con fuente).

Todas las herramientas corren **localmente**, sin enviar código a servicios externos. Las versiones exactas se registran al ejecutar.

## 7. PE5: rendimiento

Tiempo de pared de `motor analizar` sobre cada original. Se hacen 3 corridas y se reporta la mediana, junto con el número de archivos, el número de clases, la máquina (CPU y RAM) y la versión de Node.

## 8. Orden de ejecución

1. Congelar este documento (SHA-256 en `docs/evidencia/paso-5/congelamiento.txt`).
2. Clonar los 3 proyectos en los tags indicados dentro de `evaluacion/proyectos/` (fuera del control de versiones del prototipo) y registrar los hashes.
3. Corrida base del prototipo y de las demás herramientas sobre los originales; compilar los originales para `jdeps`.
4. Muestreo para PE2 (script con semilla) y revisión manual con la rúbrica.
5. Escribir las plantillas del Anexo A y verificar su CC. Correr el script de selección de siembras y anotar las instancias en el Anexo B. **Guardar** (nuevo SHA-256).
6. Aplicar las siembras en las 9 copias y correr todas las herramientas.
7. Calcular las medidas y guardar tablas y salidas crudas en `docs/evidencia/paso-5/`.

## 9. Amenazas a la validez

- **Construcción:** las siembras son sintéticas y las escribe el autor. La mitigación es la selección aleatoria con criterios sintácticos y los tamaños tomados de otra fuente; aun así no representan todos los problemas reales.
- **Revisor único:** la pertinencia es subjetiva. Mitigaciones: rúbrica previa, segundo revisor y kappa.
- **Umbrales genéricos:** vienen de otros benchmarks y herramientas (`umbrales.md` §3). No se recalibran con estos resultados. Si los resultados sugieren otros valores, se reporta como trabajo futuro.
- **Externa:** 3 proyectos de código abierto no representan todo el software Java.
- **Herramientas de referencia:** Checkstyle y `jdeps` también tienen sus propias convenciones. Las diferencias se clasifican en lugar de asumir que la referencia es la verdad absoluta.

## 10. Lo que requiere permiso antes de ejecutar

Clonar los 3 repositorios desde GitHub; descargar las dependencias de Maven y Gradle para compilar (solo para `jdeps`); descargar Checkstyle y PMD (jars oficiales); descargar la imagen de Docker de SonarQube Community Build. Nada de esto forma parte de la herramienta evaluada.

## 11. Bitácora de cambios después del congelamiento

(vacía)

## Anexo A: plantillas de métodos sembrados

(Se llena en el paso 5 del orden de ejecución, antes de aplicar las siembras.)

## Anexo B: instancias seleccionadas

(Se llena con la salida del script de selección, antes de correr herramientas sobre las copias sembradas.)
