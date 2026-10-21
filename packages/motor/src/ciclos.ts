import type { ResultadoCiclos } from './modelo.js';

const comparar = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Componentes fuertemente conexos (Tarjan, 1972). Devuelve todos los componentes,
 * incluidos los de un solo nodo, cada uno ordenado.
 */
export function componentesFuertementeConexos(ady: Map<string, string[]>): string[][] {
  let contador = 0;
  const indice = new Map<string, number>();
  const bajo = new Map<string, number>();
  const enPila = new Set<string>();
  const pila: string[] = [];
  const componentes: string[][] = [];

  const visitar = (v: string) => {
    indice.set(v, contador);
    bajo.set(v, contador);
    contador++;
    pila.push(v);
    enPila.add(v);
    for (const w of ady.get(v) ?? []) {
      if (!indice.has(w)) {
        visitar(w);
        bajo.set(v, Math.min(bajo.get(v)!, bajo.get(w)!));
      } else if (enPila.has(w)) {
        bajo.set(v, Math.min(bajo.get(v)!, indice.get(w)!));
      }
    }
    if (bajo.get(v) === indice.get(v)) {
      const componente: string[] = [];
      let w: string;
      do {
        w = pila.pop()!;
        enPila.delete(w);
        componente.push(w);
      } while (w !== v);
      componentes.push(componente.sort(comparar));
    }
  };

  for (const v of [...ady.keys()].sort(comparar)) if (!indice.has(v)) visitar(v);
  return componentes;
}

/**
 * Ciclos elementales (Johnson, 1975). Cada ciclo empieza en su nodo menor (orden lexicográfico)
 * y no repite el nodo inicial al final. Se detiene al llegar a `limite` ciclos.
 */
export function ciclosElementales(
  ady: Map<string, string[]>,
  limite = 1000,
): { ciclos: string[][]; truncado: boolean } {
  const nodos = [...ady.keys()].sort(comparar);
  const ciclos: string[][] = [];
  let truncado = false;

  for (let i = 0; i < nodos.length && !truncado; i++) {
    const inicio = nodos[i]!;
    // Subgrafo inducido por los nodos >= inicio; se trabaja dentro del CFC que contiene a `inicio`.
    const permitidos = new Set(nodos.slice(i));
    const sub = new Map<string, string[]>();
    for (const v of permitidos) sub.set(v, (ady.get(v) ?? []).filter((w) => permitidos.has(w)));
    const cfc = componentesFuertementeConexos(sub).find((c) => c.includes(inicio))!;
    if (cfc.length < 2 && !(sub.get(inicio) ?? []).includes(inicio)) continue;
    const enCfc = new Set(cfc);

    const bloqueado = new Set<string>();
    const B = new Map<string, Set<string>>();
    const pila: string[] = [];

    const desbloquear = (u: string) => {
      bloqueado.delete(u);
      const dependientes = B.get(u);
      if (!dependientes) return;
      B.delete(u);
      for (const w of dependientes) if (bloqueado.has(w)) desbloquear(w);
    };

    const circuito = (v: string): boolean => {
      let encontrado = false;
      pila.push(v);
      bloqueado.add(v);
      for (const w of sub.get(v)!) {
        if (truncado || !enCfc.has(w)) continue;
        if (w === inicio) {
          ciclos.push([...pila]);
          encontrado = true;
          if (ciclos.length >= limite) truncado = true;
        } else if (!bloqueado.has(w) && circuito(w)) {
          encontrado = true;
        }
      }
      if (encontrado) {
        desbloquear(v);
      } else {
        for (const w of sub.get(v)!) {
          if (!enCfc.has(w)) continue;
          if (!B.has(w)) B.set(w, new Set());
          B.get(w)!.add(v);
        }
      }
      pila.pop();
      return encontrado;
    };

    circuito(inicio);
  }

  ciclos.sort((a, b) => a.length - b.length || comparar(a.join('>'), b.join('>')));
  return { ciclos, truncado };
}

export function detectarCiclos(ady: Map<string, string[]>, limite = 1000): ResultadoCiclos {
  const componentes = componentesFuertementeConexos(ady)
    .filter((c) => c.length > 1)
    .sort((a, b) => comparar(a[0]!, b[0]!));
  const { ciclos, truncado } = ciclosElementales(ady, limite);
  return { componentes, ciclosElementales: ciclos, truncado };
}
