#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { analizarProyecto } from './analizar.js';
import { aDOT, aJSON, aMarkdown, aMermaid } from './exportar.js';

const AYUDA = `Uso: motor analizar <ruta-proyecto> [opciones]

Analiza estáticamente un proyecto Java (solo lectura) y reporta el grafo de
dependencias, sus ciclos, las métricas y las recomendaciones.

Opciones:
  --json <archivo>      Escribe el resultado completo en JSON
  --dot <archivo>       Escribe el grafo de clases en Graphviz DOT
  --mermaid <archivo>   Escribe el grafo de clases en Mermaid
  --md <archivo>        Escribe el reporte en Markdown
  --umbrales <archivo>  JSON con cambios a los umbrales, p. ej. {"R2": {"cc": 15}, "R4": {"activa": false}}
  --limite-ciclos <n>   Máximo de ciclos elementales a enumerar (por defecto 1000)
  -h, --help            Muestra esta ayuda

Sin opciones de salida, imprime el reporte Markdown en la salida estándar.`;

async function escribir(ruta: string, contenido: string) {
  await mkdir(path.dirname(path.resolve(ruta)), { recursive: true });
  await writeFile(ruta, contenido, 'utf8');
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      json: { type: 'string' },
      dot: { type: 'string' },
      mermaid: { type: 'string' },
      md: { type: 'string' },
      'limite-ciclos': { type: 'string' },
      umbrales: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [comando, raiz] = positionals;
  if (values.help || comando !== 'analizar' || !raiz) {
    console.log(AYUDA);
    process.exitCode = values.help ? 0 : 1;
    return;
  }

  const limite = values['limite-ciclos'] ? Number(values['limite-ciclos']) : undefined;
  const reglas = values.umbrales ? JSON.parse(await readFile(values.umbrales, 'utf8')) : undefined;
  const resultado = await analizarProyecto(raiz, { limiteCiclos: limite, reglas });

  const salidas: [string | undefined, (r: typeof resultado) => string][] = [
    [values.json, aJSON],
    [values.dot, aDOT],
    [values.mermaid, aMermaid],
    [values.md, aMarkdown],
  ];
  const alguna = salidas.some(([ruta]) => ruta);
  for (const [ruta, exportar] of salidas) if (ruta) await escribir(ruta, exportar(resultado));
  if (!alguna) process.stdout.write(aMarkdown(resultado));
  else {
    const c = resultado.ciclos.clases;
    console.log(
      `${resultado.clases.length} clases, ${resultado.grafoClases.aristas.length} aristas, ` +
        `${c.componentes.length} CFC con ciclos, ${c.ciclosElementales.length} ciclos elementales, ` +
        `${resultado.recomendaciones.filter((r) => r.principal).length} recomendaciones.`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
