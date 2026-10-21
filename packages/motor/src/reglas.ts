// Módulo de recomendaciones (paso 4): reglas deterministas con umbrales configurables.
// Cada recomendación registra problema, métricas, valores medidos, umbrales con su fuente
// y refactorizaciones sugeridas (catálogo de Fowler, 1999).
import type {
  AristaClase,
  AristaPaquete,
  CondicionEvaluada,
  Grafo,
  NodoClase,
  Recomendacion,
  ResultadoCiclos,
  Ubicacion,
} from './modelo.js';
import type { ConfiguracionReglas, Umbral } from './umbrales.js';

export interface EntradaReglas {
  clases: NodoClase[];
  grafoClases: Grafo<AristaClase>;
  grafoPaquetes: Grafo<AristaPaquete>;
  ciclos: { clases: ResultadoCiclos; paquetes: ResultadoCiclos };
}

const MAX_CICLOS_LISTADOS = 10;
const corto = (id: string) => id.slice(id.lastIndexOf('.') + 1);
const redondear = (x: number) => Math.round(x * 1e4) / 1e4;

function condicion(
  metrica: string,
  valor: number | null,
  operador: CondicionEvaluada['operador'],
  umbral: Umbral,
): CondicionEvaluada {
  const v = umbral.valor;
  const cumple =
    valor !== null && (operador === '>' ? valor > v : operador === '>=' ? valor >= v : valor < v);
  return { metrica, valor, operador, umbral: redondear(v), fuente: umbral.fuente, cumple };
}

const REFACTORIZACIONES_CICLO = [
  'Invertir la dependencia (Principio de Inversión de Dependencias): extraer una interfaz (Extract Interface) con lo que una clase usa de la otra y hacer que dependa de la interfaz.',
  'Mover la lógica compartida a una clase o paquete nuevo del que dependan ambos (Extract Class / Move Method).',
  'Si la dependencia solo sirve para navegar a otro objeto (getters), pasar ese objeto como parámetro en lugar de guardarlo.',
];

function listarCiclos(ciclos: string[][], nombre: (id: string) => string): string[] {
  const lineas = ciclos
    .slice(0, MAX_CICLOS_LISTADOS)
    .map((c) => `Ciclo: ${[...c, c[0]!].map(nombre).join(' → ')}`);
  if (ciclos.length > MAX_CICLOS_LISTADOS) lineas.push(`… y ${ciclos.length - MAX_CICLOS_LISTADOS} ciclos elementales más.`);
  return lineas;
}

/** R1: ciclos de dependencia entre clases y entre paquetes. */
function reglaCiclos(e: EntradaReglas, cfg: ConfiguracionReglas['R1']): Recomendacion[] {
  const recomendaciones: Recomendacion[] = [];
  const claseDe = new Map(e.clases.map((c) => [c.id, c]));
  const paqueteDe = (id: string) => claseDe.get(id)?.paquete || '(paquete por defecto)';

  for (const componente of e.ciclos.clases.componentes) {
    const cond = condicion('Clases en el componente fuertemente conexo', componente.length, '>', cfg.tamanoCFC);
    if (!cond.cumple) continue;
    const miembros = new Set(componente);
    const aristas = e.grafoClases.aristas.filter((a) => miembros.has(a.origen) && miembros.has(a.destino));
    const ciclos = e.ciclos.clases.ciclosElementales.filter((c) => c.every((n) => miembros.has(n)));
    // Heurística de priorización (no es un umbral): la dependencia con menos usos suele ser la más fácil de romper.
    const minimo = Math.min(...aristas.map((a) => a.evidencias.length));
    const debiles = aristas.filter((a) => a.evidencias.length === minimo);
    const usos = (a: AristaClase) => a.evidencias.map((ev) => `${ev.uso} línea ${ev.linea}`).join(', ');
    recomendaciones.push({
      regla: 'R1',
      nombreRegla: 'Ciclo de dependencias entre clases',
      principal: true,
      entidad: {
        tipo: 'ciclo-clases',
        id: componente.join(', '),
        ubicaciones: componente.map((id) => ({ archivo: claseDe.get(id)!.archivo, linea: claseDe.get(id)!.linea })),
      },
      problema:
        `Las clases ${componente.map(corto).join(', ')} dependen unas de otras de forma circular: ` +
        'no se pueden entender, probar ni reutilizar por separado.',
      condiciones: [cond],
      refactorizaciones: REFACTORIZACIONES_CICLO,
      detalles: [
        ...listarCiclos(ciclos, corto),
        `Dependencias sugeridas para empezar (las de menos usos en el código, ${minimo}): ` +
          debiles.map((a) => `${corto(a.origen)} → ${corto(a.destino)} (${usos(a)})`).join('; ') +
          '.',
      ],
    });
  }

  for (const componente of e.ciclos.paquetes.componentes) {
    const cond = condicion('Paquetes en el componente fuertemente conexo', componente.length, '>', cfg.tamanoCFC);
    if (!cond.cumple) continue;
    const miembros = new Set(componente);
    const aristas = e.grafoPaquetes.aristas.filter((a) => miembros.has(a.origen) && miembros.has(a.destino));
    const ciclos = e.ciclos.paquetes.ciclosElementales.filter((c) => c.every((n) => miembros.has(n)));
    const minimo = Math.min(...aristas.map((a) => a.peso));
    const debiles = aristas.filter((a) => a.peso === minimo);
    const clasesDe = (d: AristaPaquete) =>
      e.grafoClases.aristas
        .filter((a) => paqueteDe(a.origen) === d.origen && paqueteDe(a.destino) === d.destino)
        .map((a) => `${corto(a.origen)} → ${corto(a.destino)}`)
        .join(', ');
    const ubicaciones = new Map<string, Ubicacion>();
    for (const a of e.grafoClases.aristas) {
      const po = paqueteDe(a.origen);
      const pd = paqueteDe(a.destino);
      if (po !== pd && miembros.has(po) && miembros.has(pd)) {
        const c = claseDe.get(a.origen)!;
        ubicaciones.set(c.id, { archivo: c.archivo, linea: c.linea });
      }
    }
    recomendaciones.push({
      regla: 'R1',
      nombreRegla: 'Ciclo de dependencias entre paquetes',
      principal: true,
      entidad: { tipo: 'ciclo-paquetes', id: componente.join(', '), ubicaciones: [...ubicaciones.values()] },
      problema:
        `Los paquetes ${componente.join(', ')} dependen unos de otros de forma circular: ` +
        'no forman capas y un cambio en cualquiera puede afectar a todos.',
      condiciones: [cond],
      refactorizaciones: REFACTORIZACIONES_CICLO,
      detalles: [
        ...listarCiclos(ciclos, (p) => p),
        `Dependencias sugeridas para empezar (las de menor peso, ${minimo}): ` +
          debiles.map((d) => `${d.origen} → ${d.destino} (${clasesDe(d)})`).join('; ') +
          '.',
      ],
    });
  }
  return recomendaciones;
}

/** R2: métodos con complejidad ciclomática alta. */
function reglaMetodoComplejo(e: EntradaReglas, cfg: ConfiguracionReglas['R2']): Recomendacion[] {
  return e.clases.flatMap((c) =>
    c.metricas.metodos.flatMap((m): Recomendacion[] => {
      const cond = condicion('Complejidad ciclomática (CC)', m.cc, '>', cfg.cc);
      if (!cond.cumple) return [];
      return [
        {
          regla: 'R2',
          nombreRegla: 'Método complejo',
          principal: true,
          entidad: { tipo: 'metodo', id: `${c.id}.${m.firma}`, ubicaciones: [{ archivo: c.archivo, linea: m.linea }] },
          problema:
            `El método ${c.nombreSimple}.${m.firma} tiene ${m.cc} caminos independientes: ` +
            'es difícil de entender y requiere al menos ese número de casos de prueba para cubrirlo.',
          condiciones: [cond],
          refactorizaciones: [
            'Extract Method: separar en métodos propios los bloques que tienen una responsabilidad identificable.',
            'Decompose Conditional / Consolidate Conditional Expression: simplificar condiciones compuestas.',
            'Replace Conditional with Polymorphism: si un switch o cadena de if elige comportamiento según un tipo.',
          ],
          detalles: [],
        },
      ];
    }),
  );
}

/** Detalles comunes de God Class: qué atributos usa cada método y cuáles no usa nadie. */
function detallesGodClass(c: NodoClase): string[] {
  const metodos = c.metricas.metodos.filter((m) => !m.esConstructor);
  const usados = new Set(metodos.flatMap((m) => m.atributosUsados));
  const todos = new Set(c.metricas.metodos.flatMap((m) => m.atributosUsados));
  const detalles = metodos.map(
    (m) => `${m.firma} usa: ${m.atributosUsados.length ? m.atributosUsados.join(', ') : '(ningún atributo)'}`,
  );
  const soloConstructor = [...todos].filter((a) => !usados.has(a)).sort();
  if (soloConstructor.length) {
    detalles.push(`Atributos que solo usan los constructores: ${soloConstructor.join(', ')}.`);
  }
  return detalles;
}

const REFACTORIZACIONES_GOD_CLASS = [
  'Extract Class: separar en clases nuevas los grupos de métodos y atributos que atienden responsabilidades distintas (ver qué atributos usa cada método).',
  'Move Method / Move Field: llevar a otras clases el comportamiento que trabaja sobre sus datos.',
  'Extract Method en los métodos más complejos antes de repartirlos.',
];

/** R3 (principal) y R3-A (comparación): God Class. */
function reglasGodClass(e: EntradaReglas, cfg: ConfiguracionReglas): Recomendacion[] {
  const recomendaciones: Recomendacion[] = [];
  for (const c of e.clases) {
    const m = c.metricas;
    const variantes: [Recomendacion['regla'], boolean, string, CondicionEvaluada[]][] = [];
    if (cfg.R3.activa) {
      variantes.push([
        'R3',
        true,
        'God Class',
        [
          condicion('Weighted Methods per Class (WMC)', m.wmc, '>', cfg.R3.wmc),
          condicion('Falta de cohesión (LCOM de Henderson-Sellers)', m.lcom.hs, '>', cfg.R3.lcomHS),
        ],
      ]);
    }
    if (cfg['R3-A'].activa) {
      variantes.push([
        'R3-A',
        false,
        'God Class (estrategia canónica de Marinescu, comparación)',
        [
          condicion('Weighted Methods per Class (WMC)', m.wmc, '>=', cfg['R3-A'].wmc),
          condicion('Access To Foreign Data (ATFD)', m.atfd, '>', cfg['R3-A'].atfd),
          condicion('Tight Class Cohesion (TCC)', m.tcc, '<', cfg['R3-A'].tcc),
        ],
      ]);
    }
    for (const [regla, principal, nombreRegla, condiciones] of variantes) {
      if (!condiciones.every((x) => x.cumple)) continue;
      recomendaciones.push({
        regla,
        nombreRegla,
        principal,
        entidad: { tipo: 'clase', id: c.id, ubicaciones: [{ archivo: c.archivo, linea: c.linea }] },
        problema:
          `La clase ${c.nombreSimple} concentra mucha lógica (WMC ${m.wmc}) y sus métodos comparten pocos datos: ` +
          'probablemente mezcla varias responsabilidades.',
        condiciones,
        refactorizaciones: REFACTORIZACIONES_GOD_CLASS,
        detalles: detallesGodClass(c),
      });
    }
  }
  return recomendaciones;
}

/** R4: acoplamiento aferente alto. */
function reglaAcoplamientoAferente(e: EntradaReglas, cfg: ConfiguracionReglas['R4']): Recomendacion[] {
  return e.clases.flatMap((c): Recomendacion[] => {
    const cond = condicion('Fan-in (clases que dependen de ella)', c.metricas.fanIn, '>', cfg.fanIn);
    if (!cond.cumple) return [];
    return [
      {
        regla: 'R4',
        nombreRegla: 'Acoplamiento aferente alto',
        principal: true,
        entidad: { tipo: 'clase', id: c.id, ubicaciones: [{ archivo: c.archivo, linea: c.linea }] },
        problema:
          `${c.metricas.fanIn} clases dependen de ${c.nombreSimple}: cualquier cambio en ella puede propagarse a todas.`,
        condiciones: [cond],
        refactorizaciones: [
          'Extract Interface: que los clientes dependan de una abstracción estable en lugar de la implementación.',
          'Si atiende a clientes con necesidades distintas, dividirla (Extract Class) para que cada cliente dependa solo de lo que usa.',
        ],
        detalles: [`Dependen de ella: ${c.dependientes.map(corto).join(', ')}.`],
      },
    ];
  });
}

const ORDEN: Record<Recomendacion['regla'], number> = { R1: 0, R2: 1, R3: 2, 'R3-A': 3, R4: 4 };

/** Aplica todas las reglas activas y devuelve las recomendaciones en orden determinista. */
export function aplicarReglas(e: EntradaReglas, cfg: ConfiguracionReglas): Recomendacion[] {
  const recomendaciones = [
    ...(cfg.R1.activa ? reglaCiclos(e, cfg.R1) : []),
    ...(cfg.R2.activa ? reglaMetodoComplejo(e, cfg.R2) : []),
    ...reglasGodClass(e, cfg),
    ...(cfg.R4.activa ? reglaAcoplamientoAferente(e, cfg.R4) : []),
  ];
  return recomendaciones.sort(
    (a, b) => ORDEN[a.regla] - ORDEN[b.regla] || (a.entidad.id < b.entidad.id ? -1 : a.entidad.id > b.entidad.id ? 1 : 0),
  );
}
