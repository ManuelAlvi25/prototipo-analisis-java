// Métricas por método y por clase (paso 3). Convenciones en docs/caso-prueba-esperado.md:
// constructores incluidos en WMC y excluidos de las métricas de cohesión.
import type { ArchivoJava, MetodoJava, MetricasClase, TipoDeclarado } from './modelo.js';
import { resolverNombre, type IndiceTipos } from './resolutor.js';

const redondear = (x: number) => Math.round(x * 1e4) / 1e4;

/** Pares de métodos que comparten al menos un atributo. */
function comparten(a: MetodoJava, b: MetodoJava): boolean {
  return a.atributosUsados.some((x) => b.atributosUsados.includes(x));
}

function paresDeMetodos(metodos: MetodoJava[]): [MetodoJava, MetodoJava][] {
  const pares: [MetodoJava, MetodoJava][] = [];
  for (let i = 0; i < metodos.length; i++) for (let j = i + 1; j < metodos.length; j++) pares.push([metodos[i]!, metodos[j]!]);
  return pares;
}

/** LCOM de Chidamber y Kemerer (1994): max(P − Q, 0). */
export function lcomCK(metodos: MetodoJava[]): number {
  let p = 0;
  let q = 0;
  for (const [a, b] of paresDeMetodos(metodos)) {
    if (comparten(a, b)) q++;
    else p++;
  }
  return Math.max(p - q, 0);
}

/**
 * LCOM4 de Hitz y Montazeri (1995): número de componentes conexos del grafo de métodos,
 * donde dos métodos se unen si comparten un atributo o si uno llama al otro.
 */
export function lcom4(metodos: MetodoJava[]): number {
  const padre = metodos.map((_, i) => i);
  const raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i]!)));
  const unir = (i: number, j: number) => {
    padre[raiz(i)] = raiz(j);
  };
  metodos.forEach((a, i) =>
    metodos.forEach((b, j) => {
      if (i < j && (comparten(a, b) || a.llamadasPropias.includes(b.nombre) || b.llamadasPropias.includes(a.nombre))) {
        unir(i, j);
      }
    }),
  );
  return new Set(metodos.map((_, i) => raiz(i))).size;
}

/**
 * LCOM* de Henderson-Sellers (1996): (media de μ(A) − m) / (1 − m), donde μ(A) es el número
 * de métodos que usan el atributo A y m el número de métodos. null si no hay atributos o m < 2.
 */
export function lcomHS(metodos: MetodoJava[], atributos: string[]): number | null {
  const m = metodos.length;
  if (atributos.length === 0 || m < 2) return null;
  const media = atributos.reduce((s, a) => s + metodos.filter((x) => x.atributosUsados.includes(a)).length, 0) / atributos.length;
  return redondear((media - m) / (1 - m));
}

/** TCC de Bieman y Kang (1995), conexión directa: fracción de pares de métodos que comparten un atributo. */
export function tcc(metodos: MetodoJava[]): number | null {
  const pares = paresDeMetodos(metodos);
  if (pares.length === 0) return null;
  return redondear(pares.filter(([a, b]) => comparten(a, b)).length / pares.length);
}

/**
 * ATFD (Lanza y Marinescu 2006), aproximado: número de atributos distintos de otras clases del proyecto
 * a los que la clase accede directamente o mediante accesores (get/is sin argumentos). El tipo del
 * receptor se toma de la declaración de la variable o el campo (sin resolución de tipos).
 */
export function atfd(tipo: TipoDeclarado, archivo: ArchivoJava, indice: IndiceTipos): number {
  const accedidos = new Set<string>();
  for (const metodo of tipo.metodos) {
    for (const acceso of metodo.accesosAjenos) {
      const destino = resolverNombre(acceso.tipoReceptor, tipo, archivo, indice);
      if (destino && destino !== tipo.id) accedidos.add(`${destino}#${acceso.atributo}`);
    }
  }
  return accedidos.size;
}

export function calcularMetricasClase(
  tipo: TipoDeclarado,
  archivo: ArchivoJava,
  indice: IndiceTipos,
  dependencias: string[],
  dependientes: string[],
): MetricasClase {
  const metodos = tipo.metodos.filter((m) => !m.esConstructor);
  const atributos = tipo.campos.map((c) => c.nombre);
  return {
    wmc: tipo.metodos.reduce((s, m) => s + m.cc, 0),
    numMetodos: tipo.metodos.length,
    numAtributos: atributos.length,
    fanIn: dependientes.length,
    fanOut: dependencias.length,
    cbo: new Set([...dependencias, ...dependientes]).size,
    atfd: atfd(tipo, archivo, indice),
    tcc: tcc(metodos),
    lcom: { ck: lcomCK(metodos), lcom4: lcom4(metodos), hs: lcomHS(metodos, atributos) },
    metodos: tipo.metodos.map((m) => ({
      firma: m.firma,
      linea: m.linea,
      cc: m.cc,
      esConstructor: m.esConstructor,
      atributosUsados: m.atributosUsados,
    })),
  };
}
