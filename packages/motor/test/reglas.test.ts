// Paso 4: reglas y recomendaciones. Lo esperado sale de docs/caso-prueba-esperado.md (tres problemas
// sembrados) y de docs/umbrales.md (umbrales aprobados), no de la salida del motor.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { analizarProyecto, resolverConfiguracion, type Recomendacion, type ResultadoAnalisis } from '../src/index.js';

const FIXTURES = path.resolve(fileURLToPath(import.meta.url), '../../../../tests/fixtures');
const MONOLITICO = path.join(FIXTURES, 'sistema-monolitico');

const resumen = (r: Recomendacion) => `${r.regla} ${r.entidad.id}`;

describe('sistema-monolitico con los umbrales aprobados', () => {
  let res: ResultadoAnalisis;
  beforeAll(async () => {
    res = await analizarProyecto(MONOLITICO);
  });

  it('una recomendación por cada problema sembrado, sin falsos positivos', () => {
    expect(res.recomendaciones.map(resumen)).toEqual([
      'R1 deuda.InventarioService, deuda.NotificacionService, deuda.PedidoService', // problema 1
      'R2 deuda.SistemaMonolitico.procesarSolicitud(String, String, int, int)', // problema 2
      'R3 deuda.SistemaMonolitico', // problema 3
    ]);
  });

  it('la regla canónica de Marinescu (R3-A) no detecta la God Class sembrada', () => {
    expect(res.recomendaciones.some((r) => r.regla === 'R3-A')).toBe(false);
  });

  it('cada recomendación es trazable: problema, métrica, valor, umbral con fuente y refactorización', () => {
    for (const r of res.recomendaciones) {
      expect(r.problema.length).toBeGreaterThan(0);
      expect(r.entidad.ubicaciones.length).toBeGreaterThan(0);
      expect(r.refactorizaciones.length).toBeGreaterThan(0);
      expect(r.condiciones.length).toBeGreaterThan(0);
      for (const c of r.condiciones) {
        expect(c.metrica.length).toBeGreaterThan(0);
        expect(c.valor).not.toBeNull();
        expect(c.fuente.length).toBeGreaterThan(0);
        expect(c.cumple).toBe(true);
      }
    }
  });

  it('R3 registra los valores medidos y los umbrales de Filó et al. (2015)', () => {
    const r3 = res.recomendaciones.find((r) => r.regla === 'R3')!;
    expect(r3.condiciones.map((c) => [c.valor !== null ? Math.round(c.valor * 100) / 100 : null, c.operador, c.umbral])).toEqual([
      [41, '>', 34],
      [0.87, '>', 0.725],
    ]);
    expect(r3.condiciones.every((c) => c.fuente.startsWith('Filó, Bigonha y Ferreira (2015)'))).toBe(true);
  });

  it('R3 señala el atributo que solo se asigna en el constructor (inventarioService)', () => {
    const r3 = res.recomendaciones.find((r) => r.regla === 'R3')!;
    expect(r3.detalles).toContain('Atributos que solo usan los constructores: inventarioService.');
  });

  it('R1 lista los tres ciclos elementales del componente', () => {
    const r1 = res.recomendaciones.find((r) => r.regla === 'R1')!;
    expect(r1.detalles.filter((d) => d.startsWith('Ciclo:'))).toHaveLength(3);
  });

  it('el resultado guarda la configuración usada', () => {
    expect(res.configuracion.R2.cc).toEqual({ valor: 10, fuente: 'McCabe (1976)' });
  });
});

describe('umbrales configurables', () => {
  it('bajar el umbral de CC a 5 añade autenticar (CC 6) y marca la fuente como configurada', async () => {
    const res = await analizarProyecto(MONOLITICO, { reglas: { R2: { cc: 5 } } });
    const r2 = res.recomendaciones.filter((r) => r.regla === 'R2');
    expect(r2.map((r) => r.entidad.id)).toEqual([
      'deuda.SistemaMonolitico.autenticar(String, String)',
      'deuda.SistemaMonolitico.procesarSolicitud(String, String, int, int)',
    ]);
    expect(r2[0]!.condiciones[0]!.fuente).toBe('Configurado por el usuario (valor por defecto 10: McCabe (1976))');
  });

  it('la comparación es estricta: CC 27 no excede un umbral de 27', async () => {
    const res = await analizarProyecto(MONOLITICO, { reglas: { R2: { cc: 27 } } });
    expect(res.recomendaciones.some((r) => r.regla === 'R2')).toBe(false);
  });

  it('una regla se puede desactivar', async () => {
    const res = await analizarProyecto(MONOLITICO, { reglas: { R1: { activa: false } } });
    expect(res.recomendaciones.some((r) => r.regla === 'R1')).toBe(false);
  });

  it('R4 funciona con un umbral menor (fan-in > 2: PedidoService e InventarioService)', async () => {
    const res = await analizarProyecto(MONOLITICO, { reglas: { R4: { fanIn: 2 } } });
    expect(res.recomendaciones.filter((r) => r.regla === 'R4').map((r) => r.entidad.id)).toEqual([
      'deuda.InventarioService',
      'deuda.PedidoService',
    ]);
  });

  it('R3-A se dispara si se relajan sus tres umbrales (TCC 0.53 < 0.6, ATFD 2 > 1, WMC 41 ≥ 40)', async () => {
    const res = await analizarProyecto(MONOLITICO, { reglas: { 'R3-A': { wmc: 40, atfd: 1, tcc: 0.6 } } });
    const r3a = res.recomendaciones.filter((r) => r.regla === 'R3-A');
    expect(r3a.map((r) => r.entidad.id)).toEqual(['deuda.SistemaMonolitico']);
    expect(r3a[0]!.principal).toBe(false);
  });

  it('rechaza reglas, umbrales o valores inválidos', () => {
    expect(() => resolverConfiguracion({ R9: {} } as never)).toThrow('Regla desconocida');
    expect(() => resolverConfiguracion({ R2: { ccc: 3 } } as never)).toThrow('Umbral desconocido');
    expect(() => resolverConfiguracion({ R2: { cc: '15' } } as never)).toThrow('debe ser un número');
  });
});

describe('resolucion-paquetes', () => {
  it('solo genera las dos recomendaciones de ciclos (clases y paquetes)', async () => {
    const res = await analizarProyecto(path.join(FIXTURES, 'resolucion-paquetes'));
    expect(res.recomendaciones.map((r) => `${r.regla} ${r.entidad.tipo} ${r.entidad.id}`)).toEqual([
      'R1 ciclo-paquetes app, dominio, util',
      'R1 ciclo-clases app.Aplicacion, dominio.Pedido',
    ]);
  });
});
