import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { detectarCiclos } from './ciclos.js';
import { extraerArchivo } from './extractor.js';
import { adyacencia, construirGrafoClases, construirGrafoPaquetes, invertir } from './grafo.js';
import { calcularMetricasClase } from './metricas.js';
import type { Advertencia, ArchivoJava, NodoClase, ResultadoAnalisis } from './modelo.js';
import { obtenerParser } from './parser.js';
import { DIRECTORIOS_EXCLUIDOS_POR_DEFECTO, descubrirArchivosJava, rutaRelativa } from './proyecto.js';
import { aplicarReglas } from './reglas.js';
import { construirIndice, resolverDependencias } from './resolutor.js';
import { resolverConfiguracion, type CambiosConfiguracion } from './umbrales.js';

const VERSION: string = createRequire(import.meta.url)('../package.json').version;

export interface OpcionesAnalisis {
  /** Nombres de directorio que se ignoran al buscar archivos `.java`. */
  excluirDirectorios?: string[];
  /** Máximo de ciclos elementales a enumerar por grafo (la enumeración es exponencial en el peor caso). */
  limiteCiclos?: number;
  /** Ruta alternativa a `tree-sitter-java.wasm`. */
  rutaGramatica?: string;
  /** Cambios sobre los umbrales por defecto de docs/umbrales.md (p. ej. `{ R2: { cc: 15 } }`). */
  reglas?: CambiosConfiguracion;
}

/** Lee y extrae el modelo de todos los archivos `.java` del proyecto. */
export async function leerProyecto(
  raiz: string,
  opciones: OpcionesAnalisis = {},
): Promise<{ archivos: ArchivoJava[]; advertencias: Advertencia[] }> {
  const parser = await obtenerParser(opciones.rutaGramatica);
  const rutas = await descubrirArchivosJava(raiz, opciones.excluirDirectorios ?? DIRECTORIOS_EXCLUIDOS_POR_DEFECTO);
  const archivos: ArchivoJava[] = [];
  const advertencias: Advertencia[] = [];
  for (const ruta of rutas) {
    const codigo = await readFile(ruta, 'utf8');
    const arbol = parser.parse(codigo);
    if (!arbol) throw new Error(`tree-sitter no pudo analizar ${ruta}`);
    const archivo = extraerArchivo(rutaRelativa(raiz, ruta), arbol);
    arbol.delete();
    for (const linea of archivo.erroresSintaxis) {
      advertencias.push({ archivo: archivo.ruta, linea, mensaje: 'Error de sintaxis; el análisis de este archivo puede ser incompleto' });
    }
    archivos.push(archivo);
  }
  return { archivos, advertencias };
}

/** Pipeline completo: archivos → modelo → grafos → ciclos → métricas → recomendaciones. */
export async function analizarProyecto(raiz: string, opciones: OpcionesAnalisis = {}): Promise<ResultadoAnalisis> {
  const raizAbsoluta = path.resolve(raiz);
  const { archivos, advertencias } = await leerProyecto(raizAbsoluta, opciones);
  const { indice, advertencias: advIndice } = construirIndice(archivos);
  const dependencias = resolverDependencias(archivos, indice);

  const tipos = archivos.flatMap((a) => a.tipos).filter((t) => dependencias.has(t.id));
  const unicos = [...new Map(tipos.map((t) => [t.id, t])).values()];
  const grafoClases = construirGrafoClases(unicos, dependencias);
  const grafoPaquetes = construirGrafoPaquetes(unicos, grafoClases);

  const adyClases = adyacencia(grafoClases);
  const entrantes = invertir(adyClases);
  const limite = opciones.limiteCiclos ?? 1000;

  const archivoDe = new Map(archivos.map((a) => [a.ruta, a]));
  const clases: NodoClase[] = unicos
    .map((t) => ({
      id: t.id,
      nombreSimple: t.nombreSimple,
      paquete: t.paquete,
      clase: t.clase,
      archivo: t.archivo,
      linea: t.linea,
      dependencias: adyClases.get(t.id)!,
      dependientes: entrantes.get(t.id)!,
      metricas: calcularMetricasClase(
        t,
        archivoDe.get(t.archivo)!,
        indice,
        adyClases.get(t.id)!,
        entrantes.get(t.id)!,
      ),
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const ciclos = {
    clases: detectarCiclos(adyClases, limite),
    paquetes: detectarCiclos(adyacencia(grafoPaquetes), limite),
  };
  const configuracion = resolverConfiguracion(opciones.reglas);

  return {
    herramienta: { nombre: '@prototipo/motor', version: VERSION },
    raiz: raizAbsoluta,
    archivosAnalizados: archivos.length,
    clases,
    grafoClases,
    grafoPaquetes,
    ciclos,
    configuracion,
    recomendaciones: aplicarReglas({ clases, grafoClases, grafoPaquetes, ciclos }, configuracion),
    advertencias: [...advertencias, ...advIndice],
  };
}
