import { createRequire } from 'node:module';
import { Language, Parser } from 'web-tree-sitter';

let parserCompartido: Promise<Parser> | undefined;

/**
 * Inicializa web-tree-sitter con la gramática de Java (WASM) una sola vez.
 * `rutaGramatica` permite indicar otro .wasm (p. ej. dentro del paquete de la extensión).
 */
export function obtenerParser(rutaGramatica?: string): Promise<Parser> {
  parserCompartido ??= (async () => {
    await Parser.init();
    const ruta =
      rutaGramatica ?? createRequire(import.meta.url).resolve('tree-sitter-java/tree-sitter-java.wasm');
    const java = await Language.load(ruta);
    const parser = new Parser();
    parser.setLanguage(java);
    return parser;
  })();
  return parserCompartido;
}
