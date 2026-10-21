// Pruebas de los algoritmos de grafos sobre grafos con resultados conocidos.
import { describe, expect, it } from 'vitest';
import { ciclosElementales, componentesFuertementeConexos, detectarCiclos } from '../src/index.js';

const grafo = (aristas: string, nodos: string[] = []) => {
  const ady = new Map<string, string[]>(nodos.map((n) => [n, []]));
  for (const par of aristas.split(/\s+/).filter(Boolean)) {
    const [o, d] = par.split('>') as [string, string];
    if (!ady.has(o)) ady.set(o, []);
    if (!ady.has(d)) ady.set(d, []);
    ady.get(o)!.push(d);
  }
  return ady;
};

/** Grafo dirigido completo de n nodos: tiene sum_{k=2..n} C(n,k)·(k−1)! ciclos elementales. */
const completo = (n: number) => {
  const nodos = Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i));
  return grafo(nodos.flatMap((o) => nodos.filter((d) => d !== o).map((d) => `${o}>${d}`)).join(' '));
};

describe('Tarjan: componentes fuertemente conexos', () => {
  it('un DAG solo tiene componentes triviales', () => {
    const cfc = componentesFuertementeConexos(grafo('a>b b>c a>c'));
    expect(cfc.every((c) => c.length === 1)).toBe(true);
    expect(cfc).toHaveLength(3);
  });

  it('separa dos ciclos unidos por un puente', () => {
    const { componentes } = detectarCiclos(grafo('a>b b>a b>c c>d d>c'));
    expect(componentes).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('incluye nodos aislados', () => {
    expect(componentesFuertementeConexos(grafo('', ['x']))).toEqual([['x']]);
  });
});

describe('Johnson: ciclos elementales', () => {
  it('un DAG no tiene ciclos', () => {
    expect(ciclosElementales(grafo('a>b b>c a>c')).ciclos).toEqual([]);
  });

  it('grafo completo de 3 nodos: 5 ciclos', () => {
    expect(ciclosElementales(completo(3)).ciclos).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
    ]);
  });

  it('grafo completo de 4 nodos: 20 ciclos (6 + 8 + 6)', () => {
    const { ciclos, truncado } = ciclosElementales(completo(4));
    expect(ciclos).toHaveLength(20);
    expect(new Set(ciclos.map((c) => c.join('>'))).size).toBe(20);
    expect(truncado).toBe(false);
  });

  it('grafo completo de 5 nodos: 84 ciclos', () => {
    expect(ciclosElementales(completo(5)).ciclos).toHaveLength(84);
  });

  it('respeta el límite y marca la enumeración como truncada', () => {
    const { ciclos, truncado } = ciclosElementales(completo(4), 5);
    expect(ciclos).toHaveLength(5);
    expect(truncado).toBe(true);
  });

  it('ciclos que comparten nodos pero no aristas', () => {
    // a→b→c→a y a→d→a: dos ciclos que solo comparten a.
    expect(ciclosElementales(grafo('a>b b>c c>a a>d d>a')).ciclos).toEqual([
      ['a', 'd'],
      ['a', 'b', 'c'],
    ]);
  });
});
