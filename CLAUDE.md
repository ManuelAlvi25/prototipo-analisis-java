# Prototipo de tesis: extensión de VS Code para análisis estructural de proyectos Java

Contexto: tesis de Ingeniería en Sistemas Computacionales (UAT, Facultad de Ingeniería Tampico) de Manuel de Jesús Torres Alvineda. El documento de la tesis NO está en esta carpeta; esta carpeta es solo el prototipo. Responde siempre en español.

## Qué es y qué no es

La extensión analiza estáticamente un proyecto Java completo y:
1. Modela el proyecto como grafo de dependencias entre clases (y paquetes) y detecta ciclos.
2. Calcula métricas: complejidad ciclomática (CC), acoplamiento (CBO, fan-in/fan-out) y cohesión (LCOM).
3. Aplica reglas con umbrales sobre esas métricas y genera recomendaciones de refactorización.

Restricciones de alcance (están en la tesis, no las cambies):
- NO usa IA, LLMs ni servicios externos. Las recomendaciones salen de reglas deterministas.
- NO modifica el código analizado. Solo señala problemas y sugiere qué hacer.
- Solo Java orientado a objetos. Sin análisis dinámico ni soporte multilenguaje.
- Cada recomendación debe ser trazable: problema, métrica, valor medido, umbral excedido y refactorización sugerida.

## Objetivos específicos de la tesis (lo que este código debe cumplir)
1. Analizar limitaciones de herramientas actuales y las métricas/técnicas que las cubren (ya hecho en la tesis, cap. 8).
2. Diseñar la arquitectura de la extensión.
3. Implementar el grafo de dependencias con detección de ciclos y el cálculo de métricas (CC, acoplamiento, cohesión) por método y por clase.
4. Módulo de recomendaciones basado en reglas y umbrales.
5. Evaluar el prototipo en proyectos Java: capacidad de detectar problemas conocidos y comparación con las herramientas analizadas (Extension Pack for Java, SonarQube, Checkstyle).

## Decisiones técnicas

Confirmadas por el usuario (2026-10-19):
- TypeScript + Node.js (así dice la metodología de la tesis). npm workspaces: `packages/motor` y `packages/extension`. Pruebas con Vitest.
- Analizador: web-tree-sitter (WASM, sin compilación nativa) con la gramática tree-sitter-java. Solo da sintaxis, no resuelve tipos. El acoplamiento se calcula con los nombres de tipos referenciados (imports, tipos de campos/parámetros/retornos, `new`, llamadas estáticas). Hay que declararlo como limitación en la tesis.
- Separar el motor (biblioteca TypeScript pura, sin dependencia de VS Code) de la extensión (capa delgada que muestra resultados). El motor se prueba por línea de comandos.
- Nodo del grafo = clase; el grafo de paquetes se obtiene agregando.

## Plan por pasos (cada paso guarda evidencia para el cap. 8)
1. Diseño de la arquitectura (objetivo 2): diagrama de componentes y flujo de datos. Guardar en `docs/`.
2. Motor: leer `.java`, grafo, ciclos.
3. Métricas: CC, CBO/fan-in/fan-out, LCOM.
4. Reglas de recomendación con umbrales configurables.
5. Empaquetar como extensión de VS Code y evaluar.

Guarda en `docs/evidencia/` las salidas, capturas y tablas de cada paso: sirven para escribir los resultados de la tesis.

## Caso de prueba
`tests/fixtures/sistema-monolitico/` contiene el proyecto de 5 clases de la comparación del cap. 8, con tres problemas sembrados. Los valores esperados verificados a mano están en `docs/caso-prueba-esperado.md`. Úsalos como pruebas automáticas del motor.

## Decisiones de métricas y reglas (confirmadas 2026-10-19)
- LCOM: calcular las tres variantes (CK, LCOM4, Henderson-Sellers) y reportarlas; las reglas usan LCOM-HS (normalizada; CK se satura en 0). Con el caso de prueba CK da 0 y LCOM4 da 1 para `SistemaMonolitico`; solo HS da ~0.87.
- God Class: regla B (principal) = `WMC > 34 ∧ LCOM-HS > 0.725` (Filó et al. 2015, rango Bad). La condición de fan-out relativo se eliminó porque no tiene fuente. Regla A (comparación) = Marinescu canónica `WMC ≥ 47 ∧ ATFD > 5 ∧ TCC < 1/3`, que no detecta el caso de prueba. Se reportan ambas.
- Umbrales aprobados con sus citas y nivel de verificación: `docs/umbrales.md`. No inventar umbrales. Fan-out y CBO se reportan sin regla.

## Decisiones/pendientes abiertos
- Calibrar umbrales con el caso de prueba sería circular, porque los problemas los sembró el autor. La evaluación debe incluir además 2 o 3 proyectos Java reales de código abierto.
- El caso de prueba tiene un solo paquete (`deuda`), así que no cubre ciclos entre paquetes. Se agregó `tests/fixtures/resolucion-paquetes/` (sintético, valores esperados en su README) para ciclos entre paquetes y casos de resolución de nombres; no es un caso "real" para la evaluación.

## Estado
- Pasos 1 y 2 hechos (2026-10-19): `docs/arquitectura.md`, motor en `packages/motor`, evidencia en `docs/evidencia/paso-2/`. `npm test` desde la raíz corre las pruebas.
- Paso 3 hecho (2026-10-19): métricas en `packages/motor/src/{miembros,metricas}.ts`, evidencia en `docs/evidencia/paso-3/`. TCC y ATFD de `SistemaMonolitico` los calculó el asistente: falta que el autor los verifique.
- Paso 4 hecho (2026-10-21): reglas en `packages/motor/src/{umbrales,reglas}.ts`, umbrales configurables con `--umbrales`, evidencia en `docs/evidencia/paso-4/`. 74 pruebas.
- Paso 5: diseño congelado en `docs/evaluacion.md` (SHA-256 en `docs/evidencia/paso-5/congelamiento.txt`). Nada ejecutado todavía. Clonar repos y descargar herramientas requiere permiso del usuario. Cambios al diseño solo en su §11 (bitácora).
