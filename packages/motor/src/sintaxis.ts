// Utilidades sobre el árbol sintáctico de tree-sitter compartidas por los extractores.
import type { Node } from 'web-tree-sitter';

/** Recorrido en preorden; si `visitar` devuelve false no se desciende a los hijos. */
export function recorrer(nodo: Node, visitar: (n: Node) => boolean | void): void {
  if (visitar(nodo) === false) return;
  for (const hijo of nodo.namedChildren) recorrer(hijo, visitar);
}

export const linea = (n: Node) => n.startPosition.row + 1;

/** Quita espacios y anotaciones de tipo de un nombre calificado (`java.util.@A List` → `java.util.List`). */
export const limpiarNombre = (texto: string) => texto.replace(/@[\w.]+(\([^)]*\))?/g, '').replace(/\s+/g, '');

/** true si `nodo` es el hijo de `padre` en el campo `campo`. */
export const esCampo = (padre: Node | null, campo: string, nodo: Node) => padre?.childForFieldName(campo)?.id === nodo.id;

/**
 * Nombre del tipo base de un nodo de tipo, sin argumentos genéricos (`List<A>` → `List`).
 * Devuelve null para primitivos, arreglos y `var`.
 */
export function nombreTipoBase(tipo: Node | null): string | null {
  if (!tipo) return null;
  if (tipo.type === 'generic_type') return nombreTipoBase(tipo.namedChildren[0] ?? null);
  if (tipo.type === 'scoped_type_identifier') return limpiarNombre(tipo.text);
  if (tipo.type === 'type_identifier' && tipo.text !== 'var') return tipo.text;
  return null;
}
