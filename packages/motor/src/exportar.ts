import type { AristaClase, ResultadoAnalisis } from './modelo.js';

const nombreCorto = (id: string) => id.slice(id.lastIndexOf('.') + 1);

/** Conjunto `origen→destino` de las aristas cuyos extremos están en el mismo CFC (aristas que participan en ciclos). */
function aristasEnCiclo(res: ResultadoAnalisis): Set<string> {
  const componenteDe = new Map<string, number>();
  res.ciclos.clases.componentes.forEach((c, i) => c.forEach((n) => componenteDe.set(n, i)));
  const enCiclo = new Set<string>();
  for (const { origen, destino } of res.grafoClases.aristas) {
    const c = componenteDe.get(origen);
    if (c !== undefined && c === componenteDe.get(destino)) enCiclo.add(`${origen}>${destino}`);
  }
  return enCiclo;
}

const usos = (a: AristaClase) => [...new Set(a.evidencias.map((e) => e.uso))].join(', ');

export function aJSON(res: ResultadoAnalisis): string {
  return JSON.stringify(res, null, 2) + '\n';
}

/** Grafo de clases en formato Graphviz DOT, agrupado por paquete; las aristas de ciclos en rojo. */
export function aDOT(res: ResultadoAnalisis): string {
  const enCiclo = aristasEnCiclo(res);
  const enCfc = new Set(res.ciclos.clases.componentes.flat());
  const lineas = [
    'digraph dependencias {',
    '  rankdir=LR;',
    '  node [shape=box, style="rounded,filled", fillcolor="#ffffff", fontname="Helvetica"];',
    '  edge [fontname="Helvetica", fontsize=9];',
  ];
  res.grafoPaquetes.nodos.forEach((paquete, i) => {
    lineas.push(`  subgraph cluster_${i} {`, `    label="${paquete}";`, '    style=dashed;');
    for (const c of res.clases.filter((c) => (c.paquete || '(paquete por defecto)') === paquete)) {
      const relleno = enCfc.has(c.id) ? ', fillcolor="#fde2e2"' : '';
      lineas.push(`    "${c.id}" [label="${c.nombreSimple}"${relleno}];`);
    }
    lineas.push('  }');
  });
  for (const a of res.grafoClases.aristas) {
    const color = enCiclo.has(`${a.origen}>${a.destino}`) ? ', color="#c0392b", fontcolor="#c0392b", penwidth=2' : '';
    lineas.push(`  "${a.origen}" -> "${a.destino}" [label="${usos(a)}"${color}];`);
  }
  lineas.push('}');
  return lineas.join('\n') + '\n';
}

/** Grafo de clases en Mermaid (flowchart); las aristas de ciclos en rojo. */
export function aMermaid(res: ResultadoAnalisis): string {
  const enCiclo = aristasEnCiclo(res);
  const enCfc = new Set(res.ciclos.clases.componentes.flat());
  const idMermaid = new Map(res.clases.map((c, i) => [c.id, `n${i}`]));
  const lineas = ['flowchart LR'];
  for (const paquete of res.grafoPaquetes.nodos) {
    lineas.push(`  subgraph ${paquete.replace(/[^\w]/g, '_')}["${paquete}"]`);
    for (const c of res.clases.filter((c) => (c.paquete || '(paquete por defecto)') === paquete)) {
      lineas.push(`    ${idMermaid.get(c.id)}["${c.nombreSimple}"]`);
    }
    lineas.push('  end');
  }
  const indicesCiclo: number[] = [];
  res.grafoClases.aristas.forEach((a, i) => {
    lineas.push(`  ${idMermaid.get(a.origen)} -->|"${usos(a)}"| ${idMermaid.get(a.destino)}`);
    if (enCiclo.has(`${a.origen}>${a.destino}`)) indicesCiclo.push(i);
  });
  lineas.push('  classDef ciclo fill:#fde2e2,stroke:#c0392b,stroke-width:2px;');
  const nodosCiclo = res.clases.filter((c) => enCfc.has(c.id)).map((c) => idMermaid.get(c.id));
  if (nodosCiclo.length > 0) lineas.push(`  class ${nodosCiclo.join(',')} ciclo;`);
  if (indicesCiclo.length > 0) lineas.push(`  linkStyle ${indicesCiclo.join(',')} stroke:#c0392b,stroke-width:2px;`);
  return lineas.join('\n') + '\n';
}

const formatoValor = (x: number | null) => (x === null ? 'n/a' : String(Math.round(x * 1000) / 1000));

/** Recomendaciones trazables y tabla de umbrales usados. */
function seccionRecomendaciones(res: ResultadoAnalisis): string[] {
  const l: string[] = [];
  const principales = res.recomendaciones.filter((r) => r.principal);
  const comparacion = res.recomendaciones.filter((r) => !r.principal);
  l.push('## Recomendaciones', '');
  l.push(`Recomendaciones: ${principales.length} (más ${comparacion.length} de reglas de comparación).`, '');
  l.push('| Regla | Nombre | Recomendaciones |', '|---|---|---|');
  const conteo = new Map<string, { nombre: string; n: number }>();
  for (const r of res.recomendaciones) {
    const clave = `${r.regla}|${r.nombreRegla}`;
    conteo.set(clave, { nombre: r.nombreRegla, n: (conteo.get(clave)?.n ?? 0) + 1 });
  }
  for (const [clave, { nombre, n }] of conteo) l.push(`| ${clave.split('|')[0]} | ${nombre} | ${n} |`);
  l.push('');

  res.recomendaciones.forEach((r, i) => {
    const sufijo = r.principal ? '' : ' (regla de comparación)';
    l.push(`### ${i + 1}. [${r.regla}] ${r.nombreRegla}${sufijo}: ${r.entidad.id}`, '');
    const ubic = r.entidad.ubicaciones.map((u) => `${u.archivo}:${u.linea}`).join(', ');
    if (ubic) l.push(`- **Ubicación:** ${ubic}`);
    l.push(`- **Problema:** ${r.problema}`, '');
    l.push('| Métrica | Valor medido | Condición | Fuente del umbral |', '|---|---|---|---|');
    for (const c of r.condiciones) {
      l.push(`| ${c.metrica} | ${formatoValor(c.valor)} | ${c.operador} ${formatoValor(c.umbral)} | ${c.fuente} |`);
    }
    l.push('', '**Refactorización sugerida:**', '');
    for (const f of r.refactorizaciones) l.push(`- ${f}`);
    if (r.detalles.length) {
      l.push('', '**Detalles:**', '');
      for (const d of r.detalles) l.push(`- ${d}`);
    }
    l.push('');
  });

  l.push('## Umbrales usados', '');
  l.push('| Regla | Activa | Umbral | Valor | Fuente |', '|---|---|---|---|---|');
  for (const [id, regla] of Object.entries(res.configuracion)) {
    for (const [clave, umbral] of Object.entries(regla)) {
      if (clave === 'activa') continue;
      const u = umbral as { valor: number; fuente: string };
      l.push(`| ${id} | ${regla.activa ? 'sí' : 'no'} | ${clave} | ${formatoValor(u.valor)} | ${u.fuente} |`);
    }
  }
  l.push('');
  return l;
}

/** Reporte legible (recomendaciones, grafo, ciclos y métricas) en Markdown. */
export function aMarkdown(res: ResultadoAnalisis): string {
  const corto = (ids: string[]) => (ids.length ? ids.map(nombreCorto).join(', ') : '(ninguna)');
  const ciclo = (c: string[]) => [...c, c[0]!].map(nombreCorto).join(' → ');
  const l: string[] = [];
  l.push('# Reporte de análisis estructural', '');
  l.push(`- Herramienta: ${res.herramienta.nombre} ${res.herramienta.version}`);
  l.push(`- Archivos analizados: ${res.archivosAnalizados}`);
  l.push(`- Clases (tipos de nivel superior): ${res.clases.length}`);
  l.push(`- Aristas entre clases: ${res.grafoClases.aristas.length}`);
  l.push(`- Recomendaciones: ${res.recomendaciones.filter((r) => r.principal).length}`);
  l.push(`- Paquetes: ${res.grafoPaquetes.nodos.length} (aristas entre paquetes: ${res.grafoPaquetes.aristas.length})`, '');

  l.push(...seccionRecomendaciones(res));

  l.push('## Grafo de dependencias entre clases', '');
  l.push('| Clase | Depende de (fan-out) | Dependen de ella (fan-in) | Fan-out | Fan-in |', '|---|---|---|---|---|');
  for (const c of res.clases) {
    l.push(`| ${c.nombreSimple} | ${corto(c.dependencias)} | ${corto(c.dependientes)} | ${c.dependencias.length} | ${c.dependientes.length} |`);
  }
  l.push('');

  l.push('## Evidencia de cada arista', '');
  l.push('| Origen | Destino | Usos (línea) |', '|---|---|---|');
  for (const a of res.grafoClases.aristas) {
    const ev = a.evidencias.map((e) => `${e.uso} (${e.linea})`).join(', ');
    l.push(`| ${nombreCorto(a.origen)} | ${nombreCorto(a.destino)} | ${ev} |`);
  }
  l.push('');

  for (const [titulo, ciclos] of [
    ['clases', res.ciclos.clases],
    ['paquetes', res.ciclos.paquetes],
  ] as const) {
    l.push(`## Ciclos entre ${titulo}`, '');
    l.push(`Componentes fuertemente conexos (tamaño > 1): ${ciclos.componentes.length}`, '');
    ciclos.componentes.forEach((c, i) => l.push(`${i + 1}. {${c.map(nombreCorto).join(', ')}}`));
    if (ciclos.componentes.length) l.push('');
    l.push(`Ciclos elementales: ${ciclos.ciclosElementales.length}${ciclos.truncado ? ' (enumeración truncada)' : ''}`, '');
    ciclos.ciclosElementales.forEach((c, i) => l.push(`${i + 1}. ${ciclo(c)}`));
    if (ciclos.ciclosElementales.length) l.push('');
  }

  l.push('## Métricas por clase', '');
  l.push(
    '| Clase | WMC | Métodos | Atributos | Fan-out | Fan-in | CBO | ATFD | TCC | LCOM-CK | LCOM4 | LCOM-HS |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
  );
  for (const c of res.clases) {
    const m = c.metricas;
    l.push(
      `| ${c.nombreSimple} | ${m.wmc} | ${m.numMetodos} | ${m.numAtributos} | ${m.fanOut} | ${m.fanIn} | ${m.cbo} | ` +
        `${m.atfd} | ${formatoValor(m.tcc)} | ${m.lcom.ck} | ${m.lcom.lcom4} | ${formatoValor(m.lcom.hs)} |`,
    );
  }
  l.push('');

  l.push('## Complejidad ciclomática por método (de mayor a menor)', '');
  l.push('| Clase | Método | Línea | CC |', '|---|---|---|---|');
  const metodos = res.clases
    .flatMap((c) => c.metricas.metodos.map((m) => ({ clase: c.nombreSimple, ...m })))
    .sort((a, b) => b.cc - a.cc || (a.clase + a.firma < b.clase + b.firma ? -1 : 1));
  for (const m of metodos) l.push(`| ${m.clase} | ${m.firma} | ${m.linea} | ${m.cc} |`);
  l.push('');

  if (res.advertencias.length) {
    l.push('## Advertencias', '');
    for (const a of res.advertencias) l.push(`- ${a.archivo}${a.linea ? `:${a.linea}` : ''}: ${a.mensaje}`);
    l.push('');
  }
  return l.join('\n');
}
