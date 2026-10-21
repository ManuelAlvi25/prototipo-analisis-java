import type { Advertencia, ArchivoJava, Evidencia, ReferenciaTipo, TipoDeclarado } from './modelo.js';

/** Índice de los tipos declarados en el proyecto. */
export interface IndiceTipos {
  /** Nombre calificado (de nivel superior o anidado) → id del tipo de nivel superior que lo contiene. */
  porNombreCompleto: Map<string, string>;
  /** Paquete → nombre simple → id del tipo de nivel superior. */
  porPaquete: Map<string, Map<string, string>>;
}

export function construirIndice(archivos: ArchivoJava[]): { indice: IndiceTipos; advertencias: Advertencia[] } {
  const indice: IndiceTipos = { porNombreCompleto: new Map(), porPaquete: new Map() };
  const advertencias: Advertencia[] = [];
  for (const archivo of archivos) {
    for (const tipo of archivo.tipos) {
      if (indice.porNombreCompleto.has(tipo.id)) {
        advertencias.push({
          archivo: archivo.ruta,
          linea: tipo.linea,
          mensaje: `Tipo duplicado ${tipo.id}: se conserva la primera declaración`,
        });
        continue;
      }
      indice.porNombreCompleto.set(tipo.id, tipo.id);
      for (const anidado of tipo.anidados) {
        if (!indice.porNombreCompleto.has(anidado)) indice.porNombreCompleto.set(anidado, tipo.id);
      }
      if (!indice.porPaquete.has(tipo.paquete)) indice.porPaquete.set(tipo.paquete, new Map());
      indice.porPaquete.get(tipo.paquete)!.set(tipo.nombreSimple, tipo.id);
    }
  }
  return { indice, advertencias };
}

/**
 * Resuelve un nombre de tipo tal como aparece en `tipo` (archivo `archivo`) a un tipo de nivel
 * superior del proyecto. Devuelve `undefined` si es externo o no se puede resolver.
 * Orden de búsqueda según el alcance de la JLS §6.4.1 (ver docs/arquitectura.md §6).
 */
export function resolverNombre(
  nombre: string,
  tipo: TipoDeclarado,
  archivo: ArchivoJava,
  indice: IndiceTipos,
): string | undefined {
  if (nombre.includes('.')) return resolverCalificado(nombre, tipo, archivo, indice);
  return resolverSimple(nombre, tipo, archivo, indice);
}

function resolverSimple(
  nombre: string,
  tipo: TipoDeclarado,
  archivo: ArchivoJava,
  indice: IndiceTipos,
): string | undefined {
  // 1. El propio tipo o uno de sus anidados.
  if (nombre === tipo.nombreSimple || tipo.anidados.some((a) => a.endsWith(`.${nombre}`))) return tipo.id;

  // 2. Import de tipo único: si coincide, decide (aunque sea externo).
  for (const imp of archivo.imports) {
    if (!imp.estatico && !imp.comodin && ultimoSegmento(imp.nombre) === nombre) {
      return buscarPorPrefijo(imp.nombre, indice);
    }
  }

  // 3. Mismo paquete.
  const delPaquete = indice.porPaquete.get(tipo.paquete)?.get(nombre);
  if (delPaquete) return delPaquete;

  // 4. Imports a demanda (`p.*`, `p.Externa.*`, `static p.C.*`).
  for (const imp of archivo.imports) {
    if (imp.comodin) {
      const encontrado = indice.porNombreCompleto.get(`${imp.nombre}.${nombre}`);
      if (encontrado) return encontrado;
    }
  }

  // 5. Externo (java.lang, bibliotecas) o no resoluble.
  return undefined;
}

function resolverCalificado(
  nombre: string,
  tipo: TipoDeclarado,
  archivo: ArchivoJava,
  indice: IndiceTipos,
): string | undefined {
  const completo = buscarPorPrefijo(nombre, indice);
  if (completo) return completo;
  // `Externa.Interna` o `Map.Entry`: se resuelve el primer segmento como nombre simple.
  return resolverSimple(nombre.split('.')[0]!, tipo, archivo, indice);
}

/** Busca el nombre completo o, si no existe, su prefijo más largo que sea un tipo del proyecto. */
function buscarPorPrefijo(nombre: string, indice: IndiceTipos): string | undefined {
  const segmentos = nombre.split('.');
  for (let n = segmentos.length; n >= 1; n--) {
    const encontrado = indice.porNombreCompleto.get(segmentos.slice(0, n).join('.'));
    if (encontrado) return encontrado;
  }
  return undefined;
}

const ultimoSegmento = (nombre: string) => nombre.slice(nombre.lastIndexOf('.') + 1);

/** Referencias implícitas por `import static p.C.m;` o `import static p.C.*;`. */
function referenciasPorImportEstatico(archivo: ArchivoJava): ReferenciaTipo[] {
  return archivo.imports
    .filter((imp) => imp.estatico)
    .map((imp) => ({
      nombre: imp.comodin ? imp.nombre : imp.nombre.slice(0, imp.nombre.lastIndexOf('.')),
      uso: 'import-estatico' as const,
      linea: imp.linea,
    }));
}

/**
 * Dependencias resueltas: origen → destino → evidencias. Solo incluye tipos del proyecto
 * y excluye autorreferencias.
 */
export function resolverDependencias(
  archivos: ArchivoJava[],
  indice: IndiceTipos,
): Map<string, Map<string, Evidencia[]>> {
  const dependencias = new Map<string, Map<string, Evidencia[]>>();
  for (const archivo of archivos) {
    const estaticos = referenciasPorImportEstatico(archivo);
    for (const tipo of archivo.tipos) {
      if (indice.porNombreCompleto.get(tipo.id) !== tipo.id || dependencias.has(tipo.id)) continue; // duplicado
      const salientes = new Map<string, Evidencia[]>();
      for (const ref of [...estaticos, ...tipo.referencias]) {
        const destino = resolverNombre(ref.nombre, tipo, archivo, indice);
        if (!destino || destino === tipo.id) continue;
        if (!salientes.has(destino)) salientes.set(destino, []);
        salientes.get(destino)!.push({ uso: ref.uso, linea: ref.linea, nombre: ref.nombre });
      }
      dependencias.set(tipo.id, salientes);
    }
  }
  return dependencias;
}
