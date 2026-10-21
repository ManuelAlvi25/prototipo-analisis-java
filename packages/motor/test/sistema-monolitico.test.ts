// Valores esperados tomados de docs/caso-prueba-esperado.md (verificados a mano).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { analizarProyecto, type ResultadoAnalisis } from '../src/index.js';

const FIXTURE = path.resolve(fileURLToPath(import.meta.url), '../../../../tests/fixtures/sistema-monolitico');
const d = (nombre: string) => `deuda.${nombre}`;

let res: ResultadoAnalisis;
beforeAll(async () => {
  res = await analizarProyecto(FIXTURE);
});

describe('sistema-monolitico: grafo de dependencias entre clases', () => {
  it('encuentra las 5 clases del paquete deuda y ningún tipo externo', () => {
    expect(res.archivosAnalizados).toBe(5);
    expect(res.grafoClases.nodos).toEqual(
      ['InventarioService', 'Main', 'NotificacionService', 'PedidoService', 'SistemaMonolitico'].map(d),
    );
    expect(res.advertencias).toEqual([]);
  });

  // Tabla "Grafo de dependencias entre clases" del documento de valores esperados.
  const esperado: Record<string, { fanOut: string[]; fanIn: string[] }> = {
    Main: { fanOut: ['SistemaMonolitico'], fanIn: [] },
    SistemaMonolitico: {
      fanOut: ['PedidoService', 'InventarioService', 'NotificacionService'],
      fanIn: ['Main'],
    },
    PedidoService: {
      fanOut: ['InventarioService'],
      fanIn: ['SistemaMonolitico', 'InventarioService', 'NotificacionService'],
    },
    InventarioService: {
      fanOut: ['PedidoService', 'NotificacionService'],
      fanIn: ['SistemaMonolitico', 'PedidoService', 'NotificacionService'],
    },
    NotificacionService: {
      fanOut: ['InventarioService', 'PedidoService'],
      fanIn: ['SistemaMonolitico', 'InventarioService'],
    },
  };

  it.each(Object.entries(esperado))('%s: fan-out y fan-in coinciden', (clase, { fanOut, fanIn }) => {
    const nodo = res.clases.find((c) => c.id === d(clase))!;
    expect(nodo.dependencias).toEqual(fanOut.map(d).sort());
    expect(nodo.dependientes).toEqual(fanIn.map(d).sort());
  });

  it('tiene exactamente 9 aristas', () => {
    expect(res.grafoClases.aristas).toHaveLength(9);
  });

  it('cada arista conserva su evidencia (uso y línea)', () => {
    const arista = res.grafoClases.aristas.find(
      (a) => a.origen === d('InventarioService') && a.destino === d('NotificacionService'),
    )!;
    expect(arista.evidencias).toContainEqual({ uso: 'campo', linea: 5, nombre: 'NotificacionService' });
    expect(arista.evidencias).toContainEqual({ uso: 'new', linea: 10, nombre: 'NotificacionService' });
  });

  it('un solo paquete: el grafo de paquetes no tiene aristas', () => {
    expect(res.grafoPaquetes.nodos).toEqual(['deuda']);
    expect(res.grafoPaquetes.aristas).toEqual([]);
  });
});

describe('sistema-monolitico: problema 1, ciclos de dependencia', () => {
  it('un componente fuertemente conexo {PedidoService, InventarioService, NotificacionService}', () => {
    expect(res.ciclos.clases.componentes).toEqual([
      ['InventarioService', 'NotificacionService', 'PedidoService'].map(d),
    ]);
  });

  it('tres ciclos elementales', () => {
    // El documento escribe Pedido→Inventario→Notificacion→Pedido; el motor normaliza cada
    // ciclo para que empiece en su nodo menor (es el mismo ciclo rotado).
    expect(res.ciclos.clases.ciclosElementales).toEqual([
      ['InventarioService', 'NotificacionService'].map(d),
      ['InventarioService', 'PedidoService'].map(d),
      ['InventarioService', 'NotificacionService', 'PedidoService'].map(d),
    ]);
    expect(res.ciclos.clases.truncado).toBe(false);
  });

  it('sin ciclos entre paquetes', () => {
    expect(res.ciclos.paquetes.componentes).toEqual([]);
    expect(res.ciclos.paquetes.ciclosElementales).toEqual([]);
  });
});
