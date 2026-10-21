// Configuración de las reglas del paso 4. Los valores por defecto y sus fuentes están
// justificados en docs/umbrales.md; cualquier cambio debe reflejarse allí.

export type IdRegla = 'R1' | 'R2' | 'R3' | 'R3-A' | 'R4';

/** Un umbral con su procedencia, para que cada recomendación sea trazable. */
export interface Umbral {
  valor: number;
  fuente: string;
}

export interface ConfiguracionReglas {
  /** Ciclos de dependencia: se señala todo componente fuertemente conexo con más de `tamanoCFC` nodos. */
  R1: { activa: boolean; tamanoCFC: Umbral };
  /** Método complejo: CC > cc. */
  R2: { activa: boolean; cc: Umbral };
  /** God Class (principal): WMC > wmc ∧ LCOM-HS > lcomHS. */
  R3: { activa: boolean; wmc: Umbral; lcomHS: Umbral };
  /** God Class (Marinescu canónica, para comparación): WMC ≥ wmc ∧ ATFD > atfd ∧ TCC < tcc. */
  'R3-A': { activa: boolean; wmc: Umbral; atfd: Umbral; tcc: Umbral };
  /** Acoplamiento aferente alto: fan-in > fanIn. */
  R4: { activa: boolean; fanIn: Umbral };
}

const ADP = 'Principio de Dependencias Acíclicas (Martin, 1996, C++ Report 8(10)); Lakos (1996)';
const FILO = 'Filó, Bigonha y Ferreira (2015), Tabla I, rango Bad/Uncommon';
const LANZA = 'Lanza y Marinescu (2006), estrategia God Class, p. 80 (umbrales vía PMD GodClassRule)';

export const CONFIGURACION_POR_DEFECTO: ConfiguracionReglas = {
  R1: { activa: true, tamanoCFC: { valor: 1, fuente: ADP } },
  R2: { activa: true, cc: { valor: 10, fuente: 'McCabe (1976)' } },
  R3: {
    activa: true,
    wmc: { valor: 34, fuente: FILO },
    lcomHS: { valor: 0.725, fuente: FILO },
  },
  'R3-A': {
    activa: true,
    wmc: { valor: 47, fuente: `${LANZA}, VERY HIGH` },
    atfd: { valor: 5, fuente: `${LANZA}, FEW` },
    tcc: { valor: 1 / 3, fuente: `${LANZA}, ONE THIRD` },
  },
  R4: { activa: true, fanIn: { valor: 20, fuente: 'Ferreira et al. (2012), Tabla 3, rango bad' } },
};

/** Cambios parciales: `{ "R2": { "cc": 15 } }` cambia solo ese umbral; `{ "R4": { "activa": false } }` apaga la regla. */
export type CambiosConfiguracion = {
  [R in IdRegla]?: { activa?: boolean } & { [U in Exclude<keyof ConfiguracionReglas[R], 'activa'>]?: number };
};

/**
 * Aplica los cambios del usuario sobre la configuración por defecto. Un umbral cambiado conserva
 * la referencia a su fuente original para que el reporte muestre que fue modificado.
 */
export function resolverConfiguracion(cambios: CambiosConfiguracion = {}): ConfiguracionReglas {
  const resultado = structuredClone(CONFIGURACION_POR_DEFECTO);
  for (const [id, cambiosRegla] of Object.entries(cambios) as [IdRegla, Record<string, unknown>][]) {
    const regla = resultado[id] as unknown as Record<string, unknown> | undefined;
    if (!regla) throw new Error(`Regla desconocida en la configuración: ${id}`);
    for (const [clave, valor] of Object.entries(cambiosRegla ?? {})) {
      if (clave === 'activa') {
        if (typeof valor !== 'boolean') throw new Error(`${id}.activa debe ser true o false`);
        regla.activa = valor;
        continue;
      }
      const umbral = regla[clave] as Umbral | undefined;
      if (!umbral || typeof umbral !== 'object') throw new Error(`Umbral desconocido: ${id}.${clave}`);
      if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new Error(`${id}.${clave} debe ser un número`);
      if (valor !== umbral.valor) {
        regla[clave] = {
          valor,
          fuente: `Configurado por el usuario (valor por defecto ${umbral.valor}: ${umbral.fuente})`,
        };
      }
    }
  }
  return resultado;
}
