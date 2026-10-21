// Valores esperados en tests/fixtures/resolucion-paquetes/README.md.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { analizarProyecto, type ResultadoAnalisis } from '../src/index.js';

const FIXTURE = path.resolve(fileURLToPath(import.meta.url), '../../../../tests/fixtures/resolucion-paquetes');

let res: ResultadoAnalisis;
beforeAll(async () => {
  res = await analizarProyecto(FIXTURE);
});

const usos = (origen: string, destino: string) =>
  res.grafoClases.aristas.find((a) => a.origen === origen && a.destino === destino)?.evidencias.map((e) => e.uso);

describe('resolucion-paquetes: resolución de nombres sin tipos', () => {
  it('construye el grafo de clases esperado', () => {
    const dependencias = Object.fromEntries(res.clases.map((c) => [c.id, c.dependencias]));
    expect(dependencias).toEqual({
      'app.Aplicacion': ['dominio.Cliente', 'dominio.Pedido', 'util.Formatos'],
      'app.RepositorioPedidos': ['dominio.Pedido', 'dominio.Repositorio'],
      'dominio.Cliente': [],
      'dominio.Pedido': ['app.Aplicacion', 'dominio.Cliente'],
      'dominio.Repositorio': [],
      'util.Formatos': ['dominio.Cliente'],
    });
    expect(res.advertencias).toEqual([]);
  });

  it('import a demanda (dominio.*)', () => {
    expect(usos('app.Aplicacion', 'dominio.Pedido')).toContain('campo');
    expect(usos('app.Aplicacion', 'dominio.Cliente')).toEqual(['new']);
  });

  it('import static genera arista', () => {
    expect(usos('app.Aplicacion', 'util.Formatos')).toEqual(['import-estatico']);
  });

  it('implements con argumento genérico', () => {
    expect(usos('app.RepositorioPedidos', 'dominio.Repositorio')).toEqual(['implements']);
    expect(usos('app.RepositorioPedidos', 'dominio.Pedido')).toEqual(['generico', 'retorno']);
  });

  it('acceso estático Tipo.metodo()', () => {
    expect(usos('dominio.Pedido', 'app.Aplicacion')).toEqual(['estatico']);
  });

  it('nombre completamente calificado', () => {
    expect(usos('util.Formatos', 'dominio.Cliente')).toEqual(['retorno', 'new']);
  });

  it('un import sin usar no genera arista', () => {
    expect(usos('dominio.Cliente', 'util.Formatos')).toBeUndefined();
  });
});

describe('resolucion-paquetes: ciclos', () => {
  it('ciclo entre clases Aplicacion ↔ Pedido', () => {
    expect(res.ciclos.clases.componentes).toEqual([['app.Aplicacion', 'dominio.Pedido']]);
    expect(res.ciclos.clases.ciclosElementales).toEqual([['app.Aplicacion', 'dominio.Pedido']]);
  });

  it('grafo de paquetes agregado con pesos', () => {
    expect(res.grafoPaquetes.aristas).toEqual([
      { origen: 'app', destino: 'dominio', peso: 4 },
      { origen: 'app', destino: 'util', peso: 1 },
      { origen: 'dominio', destino: 'app', peso: 1 },
      { origen: 'util', destino: 'dominio', peso: 1 },
    ]);
  });

  it('ciclos entre paquetes', () => {
    expect(res.ciclos.paquetes.componentes).toEqual([['app', 'dominio', 'util']]);
    expect(res.ciclos.paquetes.ciclosElementales).toEqual([
      ['app', 'dominio'],
      ['app', 'util', 'dominio'],
    ]);
  });
});
