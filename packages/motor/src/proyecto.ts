import { readdir } from 'node:fs/promises';
import path from 'node:path';

/** Directorios que nunca contienen código fuente propio del proyecto. */
export const DIRECTORIOS_EXCLUIDOS_POR_DEFECTO = [
  'node_modules',
  '.git',
  '.idea',
  '.vscode',
  '.gradle',
  'target',
  'build',
  'out',
  'bin',
];

/**
 * Devuelve las rutas absolutas de todos los archivos `.java` bajo `raiz`,
 * ordenadas para que el análisis sea determinista.
 */
export async function descubrirArchivosJava(
  raiz: string,
  excluidos: string[] = DIRECTORIOS_EXCLUIDOS_POR_DEFECTO,
): Promise<string[]> {
  const resultado: string[] = [];
  const pendientes = [path.resolve(raiz)];
  while (pendientes.length > 0) {
    const dir = pendientes.pop()!;
    const entradas = await readdir(dir, { withFileTypes: true });
    for (const entrada of entradas) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        if (!excluidos.includes(entrada.name)) pendientes.push(ruta);
      } else if (entrada.isFile() && entrada.name.endsWith('.java')) {
        resultado.push(ruta);
      }
    }
  }
  return resultado.sort();
}

/** Ruta relativa a la raíz con separador `/`, para salidas independientes del sistema operativo. */
export function rutaRelativa(raiz: string, ruta: string): string {
  return path.relative(raiz, ruta).split(path.sep).join('/');
}
