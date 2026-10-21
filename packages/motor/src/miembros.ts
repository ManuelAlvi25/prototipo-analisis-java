// Extracción de atributos y métodos de un tipo, con lo necesario para las métricas del paso 3.
import type { Node } from 'web-tree-sitter';
import type { AccesoAjeno, CampoJava, MetodoJava } from './modelo.js';
import { esCampo, limpiarNombre, linea, nombreTipoBase } from './sintaxis.js';

/** Nodos que suman 1 a la complejidad ciclomática (además de `case` y de `&&`/`||`). */
const DECISIONES = new Set([
  'if_statement',
  'for_statement',
  'enhanced_for_statement',
  'while_statement',
  'do_statement',
  'catch_clause',
  'ternary_expression',
]);

/** Declaraciones de tipo anidadas o locales: su código no pertenece al método que las contiene. */
const CUERPOS_AJENOS = new Set([
  'class_body',
  'class_declaration',
  'interface_declaration',
  'enum_declaration',
  'record_declaration',
  'annotation_type_declaration',
]);

/** Recorre el código de un método sin entrar en clases anónimas ni locales. */
function recorrerMetodo(nodo: Node, visitar: (n: Node) => void): void {
  visitar(nodo);
  for (const hijo of nodo.namedChildren) if (!CUERPOS_AJENOS.has(hijo.type)) recorrerMetodo(hijo, visitar);
}

/**
 * Complejidad ciclomática: 1 + if, for, for-each, while, do, case, catch, ternario, && y ||.
 * `default` no cuenta. Las lambdas cuentan para el método que las contiene; las clases anónimas no.
 */
export function complejidadCiclomatica(metodo: Node): number {
  let cc = 1;
  const cuerpo = metodo.childForFieldName('body');
  if (!cuerpo) return cc;
  recorrerMetodo(cuerpo, (n) => {
    if (DECISIONES.has(n.type)) cc++;
    else if (n.type === 'switch_label' && n.children[0]?.type === 'case') cc++;
    else if (n.type === 'binary_expression') {
      const op = n.childForFieldName('operator')?.type;
      if (op === '&&' || op === '||') cc++;
    }
  });
  return cc;
}

/** Variables locales y parámetros del método con su tipo base (null si es primitivo, arreglo o desconocido). */
function variablesLocales(metodo: Node): Map<string, string | null> {
  const locales = new Map<string, string | null>();
  recorrerMetodo(metodo, (n) => {
    const nombre = n.childForFieldName('name');
    switch (n.type) {
      case 'formal_parameter':
      case 'enhanced_for_statement':
      case 'resource':
        if (nombre) locales.set(nombre.text, nombreTipoBase(n.childForFieldName('type')));
        break;
      case 'catch_formal_parameter':
        if (nombre) locales.set(nombre.text, null);
        break;
      case 'variable_declarator':
        // En el código de un método, un declarador es local (o parámetro variádico).
        if (nombre) locales.set(nombre.text, nombreTipoBase(n.parent?.childForFieldName('type') ?? null));
        break;
      case 'lambda_expression': {
        const params = n.childForFieldName('parameters');
        if (params?.type === 'identifier') locales.set(params.text, null);
        if (params?.type === 'inferred_parameters') params.namedChildren.forEach((p) => locales.set(p.text, null));
        break;
      }
      case 'instanceof_expression':
        if (nombre) locales.set(nombre.text, nombreTipoBase(n.childForFieldName('right')));
        break;
    }
  });
  return locales;
}

/** true si el identificador está en una posición que no es una referencia a variable. */
function noEsReferencia(id: Node): boolean {
  const padre = id.parent;
  if (!padre) return true;
  switch (padre.type) {
    case 'method_invocation':
      return esCampo(padre, 'name', id);
    case 'field_access':
      return esCampo(padre, 'field', id);
    case 'method_reference':
      return padre.namedChildren[0]?.id !== id.id;
    case 'variable_declarator':
    case 'formal_parameter':
    case 'catch_formal_parameter':
    case 'enhanced_for_statement':
    case 'resource':
      return esCampo(padre, 'name', id);
    case 'lambda_expression':
    case 'inferred_parameters':
    case 'labeled_statement':
    case 'break_statement':
    case 'continue_statement':
    case 'switch_label':
    case 'marker_annotation':
    case 'annotation':
    case 'scoped_identifier':
      return true;
  }
  return false;
}

const esThis = (n: Node | null) => n?.type === 'this';

function analizarMetodo(
  nodo: Node,
  campos: Map<string, CampoJava>,
): Omit<MetodoJava, 'nombre' | 'firma' | 'esConstructor' | 'linea' | 'cc'> {
  const locales = variablesLocales(nodo);
  const atributosUsados = new Set<string>();
  const llamadasPropias = new Set<string>();
  const accesosAjenos: AccesoAjeno[] = [];

  /** Tipo (tal como está declarado) de la expresión receptora, si se puede saber sintácticamente. */
  const tipoDe = (expr: Node | null): string | null => {
    if (!expr) return null;
    if (expr.type === 'identifier') {
      if (locales.has(expr.text)) return locales.get(expr.text)!;
      if (campos.has(expr.text)) return campos.get(expr.text)!.tipo;
      return /^[A-Z]/.test(expr.text) ? expr.text : null; // acceso estático Tipo.x
    }
    if (expr.type === 'field_access' && esThis(expr.childForFieldName('object'))) {
      return campos.get(expr.childForFieldName('field')?.text ?? '')?.tipo ?? null;
    }
    return null;
  };

  const cuerpo = nodo.childForFieldName('body');
  if (cuerpo) {
    recorrerMetodo(cuerpo, (n) => {
      if (n.type === 'identifier') {
        if (!noEsReferencia(n) && campos.has(n.text) && !locales.has(n.text)) atributosUsados.add(n.text);
      } else if (n.type === 'field_access') {
        const objeto = n.childForFieldName('object');
        const campo = n.childForFieldName('field');
        if (!campo) return;
        if (esThis(objeto)) {
          if (campos.has(campo.text)) atributosUsados.add(campo.text);
        } else if (objeto?.type !== 'super') {
          const tipo = tipoDe(objeto);
          if (tipo) accesosAjenos.push({ tipoReceptor: tipo, atributo: campo.text, linea: linea(n) });
        }
      } else if (n.type === 'method_invocation') {
        const objeto = n.childForFieldName('object');
        const nombre = n.childForFieldName('name')?.text ?? '';
        if (!objeto || esThis(objeto)) {
          llamadasPropias.add(nombre);
        } else if (objeto.type !== 'super') {
          const accesor = /^(get|is)([A-Z]\w*)$/.exec(nombre);
          const sinArgumentos = (n.childForFieldName('arguments')?.namedChildCount ?? 1) === 0;
          const tipo = tipoDe(objeto);
          if (accesor && sinArgumentos && tipo) {
            const atributo = accesor[2]!.charAt(0).toLowerCase() + accesor[2]!.slice(1);
            accesosAjenos.push({ tipoReceptor: tipo, atributo, linea: linea(n) });
          }
        }
      }
    });
  }
  return {
    atributosUsados: [...atributosUsados].sort(),
    llamadasPropias: [...llamadasPropias].sort(),
    accesosAjenos,
  };
}

function tiposDeParametros(parametros: Node | null): string[] {
  if (!parametros) return [];
  return parametros.namedChildren.flatMap((p) => {
    if (p.type === 'formal_parameter') return [limpiarNombre(p.childForFieldName('type')?.text ?? '?')];
    if (p.type === 'spread_parameter') {
      const tipo = p.namedChildren.find((h) => h.type !== 'modifiers' && h.type !== 'variable_declarator');
      return [`${limpiarNombre(tipo?.text ?? '?')}...`];
    }
    return [];
  });
}

/** Atributos y métodos declarados directamente en el tipo `tipo`. */
export function extraerMiembros(tipo: Node): { campos: CampoJava[]; metodos: MetodoJava[] } {
  const campos: CampoJava[] = [];
  const nodosMetodo: Node[] = [];
  const componentesRecord = tipo.type === 'record_declaration' ? tipo.childForFieldName('parameters') : null;

  for (const p of componentesRecord?.namedChildren ?? []) {
    const nombre = p.childForFieldName('name');
    if (p.type === 'formal_parameter' && nombre) {
      campos.push({ nombre: nombre.text, tipo: nombreTipoBase(p.childForFieldName('type')), estatico: false, linea: linea(p) });
    }
  }

  const cuerpo = tipo.childForFieldName('body');
  const miembros = (cuerpo?.namedChildren ?? []).flatMap((m) =>
    m.type === 'enum_body_declarations' ? m.namedChildren : [m],
  );
  for (const m of miembros) {
    if (m.type === 'field_declaration' || m.type === 'constant_declaration') {
      const modificadores = m.namedChildren.find((h) => h.type === 'modifiers');
      const estatico =
        m.type === 'constant_declaration' ||
        tipo.type === 'interface_declaration' ||
        !!modificadores?.children.some((h) => h.type === 'static');
      const tipoCampo = nombreTipoBase(m.childForFieldName('type'));
      for (const d of m.namedChildren.filter((h) => h.type === 'variable_declarator')) {
        const nombre = d.childForFieldName('name');
        if (nombre) campos.push({ nombre: nombre.text, tipo: tipoCampo, estatico, linea: linea(d) });
      }
    } else if (
      m.type === 'method_declaration' ||
      m.type === 'constructor_declaration' ||
      m.type === 'compact_constructor_declaration'
    ) {
      nodosMetodo.push(m);
    }
  }

  const porNombre = new Map(campos.map((c) => [c.nombre, c]));
  const metodos = nodosMetodo.map((m): MetodoJava => {
    const nombre = m.childForFieldName('name')?.text ?? '?';
    const parametros = m.type === 'compact_constructor_declaration' ? componentesRecord : m.childForFieldName('parameters');
    const firma = `${nombre}(${tiposDeParametros(parametros).join(', ')})`;
    return {
      nombre,
      firma,
      esConstructor: m.type !== 'method_declaration',
      linea: linea(m),
      cc: complejidadCiclomatica(m),
      ...analizarMetodo(m, porNombre),
    };
  });
  return { campos, metodos };
}
