import type { AristaClase, AristaPaquete, Evidencia, Grafo, TipoDeclarado } from './modelo.js';

const comparar = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function construirGrafoClases(
  tipos: TipoDeclarado[],
  dependencias: Map<string, Map<string, Evidencia[]>>,
): Grafo<AristaClase> {
  const nodos = tipos.map((t) => t.id).sort(comparar);
  const aristas: AristaClase[] = [];
  for (const origen of nodos) {
    const salientes = dependencias.get(origen);
    if (!salientes) continue;
    for (const destino of [...salientes.keys()].sort(comparar)) {
      const evidencias = [...salientes.get(destino)!].sort((a, b) => a.linea - b.linea || comparar(a.uso, b.uso));
      aristas.push({ origen, destino, evidencias });
    }
  }
  return { nodos, aristas };
}

/** Agrega las aristas de clases entre paquetes distintos; el peso es el número de aristas agregadas. */
export function construirGrafoPaquetes(
  tipos: TipoDeclarado[],
  grafoClases: Grafo<AristaClase>,
): Grafo<AristaPaquete> {
  const paqueteDe = new Map(tipos.map((t) => [t.id, t.paquete || '(paquete por defecto)']));
  const nodos = [...new Set(paqueteDe.values())].sort(comparar);
  const pesos = new Map<string, AristaPaquete>();
  for (const { origen, destino } of grafoClases.aristas) {
    const po = paqueteDe.get(origen)!;
    const pd = paqueteDe.get(destino)!;
    if (po === pd) continue;
    const clave = `${po}\u0000${pd}`;
    const arista = pesos.get(clave) ?? { origen: po, destino: pd, peso: 0 };
    arista.peso++;
    pesos.set(clave, arista);
  }
  const aristas = [...pesos.values()].sort((a, b) => comparar(a.origen, b.origen) || comparar(a.destino, b.destino));
  return { nodos, aristas };
}

/** Lista de adyacencia ordenada (para los algoritmos de ciclos). */
export function adyacencia<A extends { origen: string; destino: string }>(grafo: Grafo<A>): Map<string, string[]> {
  const ady = new Map<string, string[]>(grafo.nodos.map((n) => [n, []]));
  for (const { origen, destino } of grafo.aristas) ady.get(origen)!.push(destino);
  for (const vecinos of ady.values()) vecinos.sort(comparar);
  return ady;
}

export function invertir(ady: Map<string, string[]>): Map<string, string[]> {
  const inv = new Map<string, string[]>([...ady.keys()].map((n) => [n, []]));
  for (const [origen, vecinos] of ady) for (const destino of vecinos) inv.get(destino)!.push(origen);
  for (const vecinos of inv.values()) vecinos.sort(comparar);
  return inv;
}
