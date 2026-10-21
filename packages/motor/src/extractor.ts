import type { Node, Tree } from 'web-tree-sitter';
import { extraerMiembros } from './miembros.js';
import type { ArchivoJava, ClaseDeTipo, ImportJava, ReferenciaTipo, TipoDeclarado, UsoDeTipo } from './modelo.js';
import { limpiarNombre, linea, recorrer } from './sintaxis.js';

const DECLARACIONES_DE_TIPO: Record<string, ClaseDeTipo> = {
  class_declaration: 'class',
  interface_declaration: 'interface',
  enum_declaration: 'enum',
  record_declaration: 'record',
  annotation_type_declaration: 'annotation',
};

/** Nodos que declaran un nombre de variable, parámetro o campo (campo `name`). */
const DECLARADORES_DE_VARIABLE = new Set([
  'variable_declarator',
  'formal_parameter',
  'catch_formal_parameter',
  'enhanced_for_statement',
  'resource',
  'instanceof_expression',
]);

/** Primer ancestro que determina el uso de una referencia de tipo. */
const USO_POR_ANCESTRO: Record<string, UsoDeTipo> = {
  type_arguments: 'generico',
  type_bound: 'generico',
  superclass: 'extends',
  super_interfaces: 'implements',
  extends_interfaces: 'implements',
  field_declaration: 'campo',
  constant_declaration: 'campo',
  formal_parameter: 'parametro',
  spread_parameter: 'parametro',
  receiver_parameter: 'parametro',
  catch_type: 'catch',
  throws: 'throws',
  object_creation_expression: 'new',
  array_creation_expression: 'new',
  cast_expression: 'cast',
  instanceof_expression: 'instanceof',
  class_literal: 'literal-clase',
  method_reference: 'referencia-metodo',
  local_variable_declaration: 'variable',
  resource: 'variable',
  enhanced_for_statement: 'variable',
};

function clasificarUso(nodo: Node): UsoDeTipo {
  let hijo = nodo;
  let padre = nodo.parent;
  while (padre) {
    const uso = USO_POR_ANCESTRO[padre.type];
    if (uso) return uso;
    if (padre.type === 'method_declaration' || padre.type === 'annotation_type_element_declaration') {
      return padre.childForFieldName('type')?.id === hijo.id ? 'retorno' : 'otro';
    }
    if (padre.type === 'class_body' || padre.type === 'block' || padre.type === 'program') return 'otro';
    hijo = padre;
    padre = padre.parent;
  }
  return 'otro';
}

function extraerImport(nodo: Node): ImportJava {
  const hijos = nodo.children;
  const nombre = hijos.find((h) => h.type === 'scoped_identifier' || h.type === 'identifier');
  return {
    nombre: nombre ? limpiarNombre(nombre.text) : '',
    estatico: hijos.some((h) => h.type === 'static'),
    comodin: hijos.some((h) => h.type === 'asterisk'),
    linea: linea(nodo),
  };
}

/** Nombres de variables/parámetros/campos y de parámetros de tipo declarados dentro de `tipo`. */
function recolectarNombresDeclarados(tipo: Node): { variables: Set<string>; parametrosDeTipo: Set<string> } {
  const variables = new Set<string>();
  const parametrosDeTipo = new Set<string>();
  recorrer(tipo, (n) => {
    if (DECLARADORES_DE_VARIABLE.has(n.type)) {
      const nombre = n.childForFieldName('name');
      if (nombre?.type === 'identifier') variables.add(nombre.text);
    } else if (n.type === 'lambda_expression') {
      const params = n.childForFieldName('parameters');
      if (params?.type === 'identifier') variables.add(params.text);
      if (params?.type === 'inferred_parameters') params.namedChildren.forEach((p) => variables.add(p.text));
    } else if (n.type === 'type_pattern') {
      n.namedChildren.filter((h) => h.type === 'identifier').forEach((h) => variables.add(h.text));
    } else if (n.type === 'type_parameter') {
      const nombre = n.namedChildren.find((h) => h.type === 'type_identifier' || h.type === 'identifier');
      if (nombre) parametrosDeTipo.add(nombre.text);
    }
  });
  return { variables, parametrosDeTipo };
}

/** Si `objeto` es un identificador con aspecto de nombre de tipo (acceso estático candidato). */
function esCandidatoEstatico(objeto: Node | null, variables: Set<string>): objeto is Node {
  return !!objeto && objeto.type === 'identifier' && /^[A-Z]/.test(objeto.text) && !variables.has(objeto.text);
}

function recolectarReferencias(tipo: Node): ReferenciaTipo[] {
  const { variables, parametrosDeTipo } = recolectarNombresDeclarados(tipo);
  const referencias: ReferenciaTipo[] = [];
  const agregar = (nombre: string, uso: UsoDeTipo, nodo: Node) => referencias.push({ nombre, uso, linea: linea(nodo) });

  recorrer(tipo, (n) => {
    switch (n.type) {
      case 'type_identifier': {
        if (n.parent?.type === 'type_parameter') return; // nombre declarado del parámetro de tipo
        if (n.text === 'var' || parametrosDeTipo.has(n.text)) return;
        agregar(n.text, clasificarUso(n), n);
        return;
      }
      case 'scoped_type_identifier': {
        // Se toma el nombre calificado completo y no se desciende (sus segmentos no son tipos sueltos).
        agregar(limpiarNombre(n.text), clasificarUso(n), n);
        return false;
      }
      case 'marker_annotation':
      case 'annotation': {
        const nombre = n.childForFieldName('name');
        if (nombre) agregar(limpiarNombre(nombre.text), 'anotacion', n);
        return;
      }
      case 'method_invocation':
      case 'field_access': {
        const objeto = n.childForFieldName('object');
        if (esCandidatoEstatico(objeto, variables)) agregar(objeto.text, 'estatico', objeto);
        return;
      }
      case 'method_reference': {
        const objeto = n.namedChildren[0] ?? null;
        if (esCandidatoEstatico(objeto, variables)) agregar(objeto.text, 'referencia-metodo', objeto);
        return;
      }
    }
  });
  return referencias;
}

/** Nombres calificados de los tipos anidados (en cualquier profundidad) dentro de `tipo`. */
function recolectarAnidados(tipo: Node, idTipo: string): string[] {
  const anidados: string[] = [];
  const visitar = (nodo: Node, idPadre: string) => {
    for (const hijo of nodo.namedChildren) {
      if (hijo.type in DECLARACIONES_DE_TIPO) {
        const id = `${idPadre}.${hijo.childForFieldName('name')?.text ?? '?'}`;
        anidados.push(id);
        visitar(hijo, id);
      } else {
        visitar(hijo, idPadre);
      }
    }
  };
  visitar(tipo, idTipo);
  return anidados;
}

function lineasConError(arbol: Tree): number[] {
  if (!arbol.rootNode.hasError) return [];
  const lineas = new Set<number>();
  const visitar = (n: Node) => {
    if (n.isError || n.isMissing) lineas.add(linea(n));
    else if (n.hasError) n.children.forEach(visitar);
  };
  visitar(arbol.rootNode);
  return [...lineas].sort((a, b) => a - b);
}

/** Convierte el árbol sintáctico de un archivo en el modelo intermedio. */
export function extraerArchivo(ruta: string, arbol: Tree): ArchivoJava {
  const raiz = arbol.rootNode;
  let paquete = '';
  const imports: ImportJava[] = [];
  const tipos: TipoDeclarado[] = [];

  for (const nodo of raiz.namedChildren) {
    if (nodo.type === 'package_declaration') {
      const nombre = nodo.namedChildren.find((h) => h.type === 'scoped_identifier' || h.type === 'identifier');
      paquete = nombre ? limpiarNombre(nombre.text) : '';
    } else if (nodo.type === 'import_declaration') {
      imports.push(extraerImport(nodo));
    } else if (nodo.type in DECLARACIONES_DE_TIPO) {
      const nombreSimple = nodo.childForFieldName('name')?.text ?? '?';
      const id = paquete ? `${paquete}.${nombreSimple}` : nombreSimple;
      tipos.push({
        id,
        nombreSimple,
        paquete,
        clase: DECLARACIONES_DE_TIPO[nodo.type]!,
        archivo: ruta,
        linea: linea(nodo),
        anidados: recolectarAnidados(nodo, id),
        referencias: recolectarReferencias(nodo),
        ...extraerMiembros(nodo),
      });
    }
  }
  return { ruta, paquete, imports, tipos, erroresSintaxis: lineasConError(arbol) };
}
