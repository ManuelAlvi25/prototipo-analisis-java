// Valores esperados tomados de docs/caso-prueba-esperado.md (verificados a mano por el autor),
// salvo donde se indica lo contrario.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { analizarProyecto, type MetricasClase, type ResultadoAnalisis } from '../src/index.js';

const FIXTURE = path.resolve(fileURLToPath(import.meta.url), '../../../../tests/fixtures/sistema-monolitico');

let res: ResultadoAnalisis;
beforeAll(async () => {
  res = await analizarProyecto(FIXTURE);
});

const metricas = (clase: string): MetricasClase => res.clases.find((c) => c.nombreSimple === clase)!.metricas;
const cc = (clase: string, firma: string) => metricas(clase).metodos.find((m) => m.firma === firma)?.cc;

describe('sistema-monolitico: problema 2, complejidad ciclomática por método', () => {
  it.each([
    ['SistemaMonolitico', 'procesarSolicitud(String, String, int, int)', 27],
    ['SistemaMonolitico', 'autenticar(String, String)', 6],
    ['InventarioService', 'reservar(String, int)', 3],
    ['SistemaMonolitico', 'exportarAuditoria(String)', 3],
    ['SistemaMonolitico', 'generarFactura(String, double, boolean)', 2],
    ['PedidoService', 'prepararPedido(String, int)', 2],
    ['PedidoService', 'PedidoService(boolean)', 2],
  ])('%s.%s = %i', (clase, firma, esperado) => {
    expect(cc(clase, firma)).toBe(esperado);
  });

  it('constructores restantes, getters y Main.main valen 1', () => {
    const conDecisiones = new Set([
      'procesarSolicitud(String, String, int, int)',
      'autenticar(String, String)',
      'reservar(String, int)',
      'exportarAuditoria(String)',
      'generarFactura(String, double, boolean)',
      'prepararPedido(String, int)',
      'PedidoService(boolean)',
    ]);
    const resto = res.clases.flatMap((c) => c.metricas.metodos).filter((m) => !conDecisiones.has(m.firma));
    expect(resto.length).toBeGreaterThan(0);
    expect(resto.every((m) => m.cc === 1)).toBe(true);
  });

  it('con el umbral de McCabe (CC > 10) solo se señala procesarSolicitud', () => {
    const complejos = res.clases.flatMap((c) => c.metricas.metodos.filter((m) => m.cc > 10).map((m) => m.firma));
    expect(complejos).toEqual(['procesarSolicitud(String, String, int, int)']);
  });
});

describe('sistema-monolitico: problema 3, métricas por clase', () => {
  // Tabla "Problema 3: God Class" del documento de valores esperados.
  it.each([
    ['SistemaMonolitico', 41, 3, 1, 4, 0.87],
    ['PedidoService', 6, 1, 3, 3, 0.0],
    ['InventarioService', 6, 2, 3, 3, 0.83],
    ['NotificacionService', 5, 2, 2, 3, 1.0],
  ])('%s: WMC %i, fan-out %i, fan-in %i, CBO %i, LCOM-HS %f', (clase, wmc, fanOut, fanIn, cbo, hs) => {
    const m = metricas(clase);
    expect(m.wmc).toBe(wmc);
    expect(m.fanOut).toBe(fanOut);
    expect(m.fanIn).toBe(fanIn);
    expect(m.cbo).toBe(cbo);
    expect(m.lcom.hs).toBeCloseTo(hs, 2);
  });

  it('Main: WMC 1, fan-out 1, fan-in 0, CBO 1, LCOM-HS n/a (sin atributos)', () => {
    const m = metricas('Main');
    expect([m.wmc, m.fanOut, m.fanIn, m.cbo]).toEqual([1, 1, 0, 1]);
    expect(m.lcom.hs).toBeNull();
  });

  it('otras variantes de LCOM no detectan a SistemaMonolitico: CK = 0 y LCOM4 = 1', () => {
    expect(metricas('SistemaMonolitico').lcom.ck).toBe(0);
    expect(metricas('SistemaMonolitico').lcom.lcom4).toBe(1);
  });

  // Estos dos valores NO están en caso-prueba-esperado.md: los calculó a mano el asistente
  // (TCC = 8 pares conectados de 15; ATFD = getInventarioService() y getNotificacionService()
  // en el constructor). El autor debe verificarlos y agregarlos al documento.
  it('SistemaMonolitico: TCC = 8/15 y ATFD = 2 (regla A no se cumple)', () => {
    expect(metricas('SistemaMonolitico').tcc).toBeCloseTo(8 / 15, 3);
    expect(metricas('SistemaMonolitico').atfd).toBe(2);
  });
});
