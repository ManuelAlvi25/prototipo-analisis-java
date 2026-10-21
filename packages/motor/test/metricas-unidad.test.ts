// Pruebas unitarias de la extracción de miembros y de las fórmulas de cohesión.
import { beforeAll, describe, expect, it } from 'vitest';
import type { Parser } from 'web-tree-sitter';
import { extraerArchivo } from '../src/extractor.js';
import { lcom4, lcomCK, lcomHS, tcc, type MetodoJava, type TipoDeclarado } from '../src/index.js';
import { obtenerParser } from '../src/parser.js';

let parser: Parser;
beforeAll(async () => {
  parser = await obtenerParser();
});

const primerTipo = (codigo: string): TipoDeclarado => extraerArchivo('A.java', parser.parse(codigo)!).tipos[0]!;
const metodo = (codigo: string, firma: string) => primerTipo(codigo).metodos.find((m) => m.firma === firma)!;

describe('complejidad ciclomática', () => {
  it('cuenta case (no default), switch con flechas, &&, ||, lambdas, do, catch y ternario; no clases anónimas', () => {
    const codigo = `class A {
      int m(int a, int b, boolean c) {
        switch (a) { case 1: case 2, 3: break; default: }             // +2
        int r = switch (b) { case 1 -> 2; default -> 3; };              // +1
        boolean t = a > 1 && b < 2 || c;                                // +2
        Runnable q = () -> { if (a > 0) {} };                           // +1
        new Object() { void z() { if (true) {} } };                     // +0
        do { a--; } while (a > 0);                                      // +1
        try { r++; } catch (IllegalStateException e) {} catch (RuntimeException e) {} // +2
        return c ? r : 0;                                               // +1
      }
    }`;
    expect(metodo(codigo, 'm(int, int, boolean)').cc).toBe(11);
  });

  it('métodos abstractos y sin cuerpo valen 1', () => {
    expect(metodo('abstract class A { abstract void m(); }', 'm()').cc).toBe(1);
  });
});

describe('atributos usados por cada método', () => {
  const codigo = `class A {
    private int x;
    private int y;
    A(int x) { this.x = x; }
    int leer() { return x; }
    void sombra() { int x = 1; System.out.println(x); }
    void ajeno(A otro) { otro.y = 1; }
    void ambos() { y = x + this.y; leer(); }
  }`;
  const usados = (firma: string) => metodo(codigo, firma).atributosUsados;

  it('this.campo en el constructor aunque el parámetro tenga el mismo nombre', () => {
    expect(usados('A(int)')).toEqual(['x']);
  });
  it('nombre simple de un campo', () => expect(usados('leer()')).toEqual(['x']));
  it('una variable local que oculta al campo no cuenta', () => expect(usados('sombra()')).toEqual([]));
  it('el campo de otro objeto no es un atributo propio', () => expect(usados('ajeno(A)')).toEqual([]));
  it('lectura, escritura y this.campo; registra llamadas propias', () => {
    expect(usados('ambos()')).toEqual(['x', 'y']);
    expect(metodo(codigo, 'ambos()').llamadasPropias).toEqual(['leer']);
  });
});

describe('accesos a datos ajenos (insumo de ATFD)', () => {
  it('detecta accesores sin argumentos y acceso directo, con el tipo declarado del receptor', () => {
    const codigo = `class A {
      private Pedido pedido;
      void m(Cliente c, String s) {
        pedido.getTotal();      // accesor
        c.isActivo();           // accesor booleano
        c.nombre = s.trim();    // acceso directo; trim() no es accesor
        pedido.getLinea(1);     // con argumentos: no es accesor
      }
    }`;
    expect(metodo(codigo, 'm(Cliente, String)').accesosAjenos.map((a) => `${a.tipoReceptor}.${a.atributo}`)).toEqual([
      'Pedido.total',
      'Cliente.activo',
      'Cliente.nombre',
    ]);
  });
});

describe('fórmulas de cohesión', () => {
  // m1{a}, m2{a}, m3{b}, m4{} con m4 → m3
  const m = (nombre: string, atributos: string[], llamadas: string[] = []): MetodoJava => ({
    nombre,
    firma: `${nombre}()`,
    esConstructor: false,
    linea: 1,
    cc: 1,
    atributosUsados: atributos,
    llamadasPropias: llamadas,
    accesosAjenos: [],
  });
  const metodos = [m('m1', ['a']), m('m2', ['a']), m('m3', ['b']), m('m4', [], ['m3'])];

  it('LCOM-CK = P − Q = 5 − 1 = 4', () => expect(lcomCK(metodos)).toBe(4));
  it('LCOM4 = 2 componentes ({m1,m2}, {m3,m4})', () => expect(lcom4(metodos)).toBe(2));
  it('LCOM-HS = ((2+1)/2 − 4) / (1 − 4) ≈ 0.8333', () => expect(lcomHS(metodos, ['a', 'b'])).toBeCloseTo(0.8333, 4));
  it('TCC = 1/6', () => expect(tcc(metodos)).toBeCloseTo(1 / 6, 4));
  it('LCOM-HS es null sin atributos o con menos de 2 métodos', () => {
    expect(lcomHS(metodos, [])).toBeNull();
    expect(lcomHS([m('m1', ['a'])], ['a'])).toBeNull();
  });
});
