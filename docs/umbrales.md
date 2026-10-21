# Umbrales de los pasos 3 y 4 (APROBADOS el 2026-10-19)

Fecha: 2026-10-19. Los umbrales se fijaron con base en la literatura **antes** de implementar las métricas. La columna "Caso de prueba" solo describe la consecuencia que tendría cada umbral sobre `sistema-monolitico`, usando los valores de `caso-prueba-esperado.md`. No se usó para elegir ningún umbral.

Nivel de verificación de cada fuente:
- **V** = verificado leyendo la fuente primaria en esta sesión.
- **S** = verificado solo en una fuente secundaria (otra herramienta o material de curso que cita la fuente).
- **M** = cita de memoria, todavía sin verificar.

## 1. Tabla de reglas propuestas

| # | Regla | Condición | Fuente | Verif. | Caso de prueba |
|---|---|---|---|---|---|
| R1 | Ciclo de dependencias (clases y paquetes) | CFC de tamaño > 1 (cero ciclos tolerados) | Principio de Dependencias Acíclicas (Martin); levelización (Lakos 1996) | S | 1 CFC {Pedido, Inventario, Notificacion} → se detecta |
| R2 | Método complejo | CC > 10 | McCabe 1976 | V (a) | solo `procesarSolicitud` (27) |
| R3 | God Class, regla B adaptada (principal) | WMC > 34 ∧ LCOM-HS > 0.725 | Filó, Bigonha y Ferreira 2015, Tabla I, rango Bad/Uncommon | V | `SistemaMonolitico` (41; 0.87) → se detecta. El resto tiene WMC ≤ 6 |
| R3-A | God Class, regla A canónica (comparación) | WMC ≥ 47 ∧ ATFD > 5 ∧ TCC < 1/3 | Lanza y Marinescu 2006, p. 80 (umbrales en pp. 16–18) | S (b) | `SistemaMonolitico`: WMC 41, TCC ≈ 0.53, ATFD ≈ 2 → **no se detecta** (no se cumple ninguna de las tres condiciones) |
| R4 | Acoplamiento aferente alto | fan-in de clase > 20 | Ferreira et al. 2012, Tabla 3, rango bad | V | ninguna (máximo 3) |

(a) El valor de 10 y la cita de McCabe (IEEE TSE SE-2(4):308–320, 1976) se confirmaron en Alves et al. 2010, §I y su ref. [1]. No se leyó el artículo de McCabe.
(b) Los valores 47, FEW = 5 y 1/3 vienen de `GodClassRule` de PMD, que cita las páginas del libro (16, 18, 17 y 80). No se leyó el libro.

## 2. Detalle por métrica

### Complejidad ciclomática (por método)
- **McCabe 1976:** propone 10 como límite. Alves et al. 2010 lo describen así: "McCabe proposed a threshold value of 10 for his complexity metrics" e indican que no pretendía ser universal.
- **NIST SP 500-235 (Watson y McCabe 1996):** acepta hasta 15 en ciertas condiciones. Solo se verificó en fuentes secundarias (documentación de Visual Studio y Wikipedia); hay que revisarlo en doi.org/10.6028/NIST.SP.500-235 antes de citarlo.
- **Alternativa por benchmark:** Alves, Ypma y Visser 2010 (ICSM, pp. 1–10), con 100 sistemas Java/C#, obtienen los cuantiles 70/80/90 % = 6, 8 y 14 (Tabla IV). Ojo: en §III el mismo artículo dice "6, 8 and 15"; hay que citar la Tabla IV. Se podrían usar como niveles de severidad en el reporte, no como regla.
- Filó et al. 2015 (VG): Bad > 4. **No se recomienda como umbral de alarma**: mide qué tan raro es un valor, no si es un problema, y además marcaría `autenticar` (6).

### WMC (por clase)
- **Filó et al. 2015:** Good ≤ 11, Regular ≤ 34, Bad > 34. Se obtuvo con el plugin Metrics 1.3.8, donde WMC = suma de la CC de McCabe de los métodos. Es la misma definición que usa este motor.
- **Lanza y Marinescu 2006 (Java, 45 sistemas):** AVG 14, HIGH 31, VERY HIGH 47. Verificado de forma indirecta: con la tabla de NOM, LOC/método y CYCLO/LOC (material de curso UFMG, sección 2.1 del libro) sale AVG 7×10×0.20 = 14 y HIGH 10×13×0.24 ≈ 31. VERY HIGH = 1.5 × HIGH ≈ 47 aplica la regla del libro "very high = 50 % más que high". PMD usa 47.

### Cohesión
- **LCOM-HS (Henderson-Sellers, LCOM\*):** Filó et al. 2015 dan Good ≤ 0.167, Regular ≤ 0.725 y Bad > 0.725. Su LCOM viene del plugin Metrics, que según su documentación (metrics.sourceforge.net) calcula "Henderson-Sellers method (LCOM\*)". Falta confirmar que la versión 1.3.8 usa la misma definición que la 1.3.x documentada.
- **LCOM-CK:** Ferreira et al. 2012 (JSS 85(2):244–257, 40 sistemas Java) dan Good 0, Regular 1–20 y Bad > 20. Se reportará, pero no entra en ninguna regla.
- **LCOM4:** no se encontró umbral. Se reporta como información.
- **TCC** (solo para R3-A): menor que 1/3 (Lanza y Marinescu, vía PMD y material UFMG).

### Acoplamiento
- **Fan-in de clase (afferent couplings):** Ferreira et al. 2012 dan Good ≤ 1, Regular 2–20 y Bad > 20. Su definición cuenta llamadas, accesos a campos y herencia (§3.1). La nuestra es más amplia (cualquier referencia de tipo) y eso tiende a sobreestimar.
- **Fan-out de clase y CBO:** **no se encontró un umbral verificado.** Filó et al. 2015 dan CA > 39 y CE > 16, pero a nivel de **paquete** (Martin). Podrían servir para una regla de paquetes.
- **ATFD** (solo para R3-A): FEW. Hay una discrepancia: el material UFMG dice FEW = 3 y PMD dice "between 2 and 5" y usa 5. Hay que confirmarlo en el libro, p. 18.

## 3. Decisiones tomadas

1. **Regla B sin condición de fan-out (decidido el 2026-10-19).** La propuesta original incluía "fan-out relativo ≥ 50 %", pero no se encontró ninguna fuente que la respalde, así que se eliminó. R3 queda como WMC > 34 ∧ LCOM-HS > 0.725: ambos umbrales vienen de la misma fuente y del mismo benchmark. El fan-out y el CBO se calculan y se reportan, pero no disparan ninguna recomendación porque no hay un umbral verificado (se declara como limitación).
2. **Comparabilidad entre herramientas:** cada umbral se derivó con otra herramienta (Metrics, Connecta, SIG SAT), y Alves et al. (§VII-D) advierten que las implementaciones difieren. Hay que declararlo como limitación.
3. **Citas de R1 (actualizado el 2026-10-21, ahora nivel S):** Martin, R. C. (1996). Engineering Notebook: Granularity. *C++ Report*, 8(10), 57–62, donde se enuncia el Principio de Dependencias Acíclicas (confirmado en bibliografías y material de curso, sin leer el original). Lakos, J. (1996). *Large-Scale C++ Software Design*. Addison-Wesley, ISBN 9780201633627 (la editorial confirma el tema de eliminar dependencias físicas cíclicas). R1 no tiene umbral numérico propiamente dicho: cualquier ciclo se señala.
4. **Configuración:** los valores por defecto viven en `packages/motor/src/umbrales.ts` con su fuente. Se pueden cambiar con `--umbrales archivo.json`, y la recomendación indica entonces "Configurado por el usuario (valor por defecto …)".

## Referencias verificadas

- Alves, T. L., Ypma, C., y Visser, J. (2010). Deriving metric thresholds from benchmark data. *26th IEEE ICSM*, pp. 1–10.
- Ferreira, K. A. M., Bigonha, M. A. S., Bigonha, R. S., Mendes, L. F. O., y Almeida, H. C. (2012). Identifying thresholds for object-oriented software metrics. *Journal of Systems and Software*, 85(2), 244–257. doi:10.1016/j.jss.2011.05.044
- Filó, T. G. S., Bigonha, M. A. S., y Ferreira, K. A. M. (2015). A catalogue of thresholds for object-oriented software metrics. *SOFTENG 2015*, pp. 48–55. IARIA.
- PMD, `GodClassRule.java` (código fuente, rama main), consultado el 2026-10-19.
- Figueiredo, E. *Metrics and Thresholds* (diapositivas, DCC/UFMG), basadas en Lanza y Marinescu 2006, §2.1.
