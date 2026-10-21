// Estructuras de datos intermedias del pipeline. Todas son serializables a JSON.
import type { ConfiguracionReglas, IdRegla } from './umbrales.js';

export type ClaseDeTipo = 'class' | 'interface' | 'enum' | 'record' | 'annotation';

/** Contexto sintáctico en el que aparece una referencia a un tipo. */
export type UsoDeTipo =
  | 'campo'
  | 'parametro'
  | 'retorno'
  | 'variable'
  | 'new'
  | 'extends'
  | 'implements'
  | 'generico'
  | 'catch'
  | 'throws'
  | 'cast'
  | 'instanceof'
  | 'literal-clase'
  | 'anotacion'
  | 'referencia-metodo'
  | 'estatico'
  | 'import-estatico'
  | 'otro';

export interface ImportJava {
  /** Nombre tal como aparece, sin `.*` (p. ej. `java.util.List` o `java.util`). */
  nombre: string;
  estatico: boolean;
  comodin: boolean;
  linea: number;
}

export interface ReferenciaTipo {
  /** Nombre tal como aparece en el código (simple o calificado, sin argumentos genéricos). */
  nombre: string;
  uso: UsoDeTipo;
  linea: number;
}

export interface TipoDeclarado {
  /** Nombre completamente calificado: `paquete.Nombre`. Es el id del nodo en el grafo. */
  id: string;
  nombreSimple: string;
  paquete: string;
  clase: ClaseDeTipo;
  /** Ruta del archivo relativa a la raíz del proyecto, con `/`. */
  archivo: string;
  linea: number;
  /** Nombres calificados de los tipos anidados (p. ej. `p.Externa.Interna`). */
  anidados: string[];
  referencias: ReferenciaTipo[];
  /** Atributos declarados directamente en el tipo (incluye componentes de record). */
  campos: CampoJava[];
  /** Métodos y constructores declarados directamente en el tipo (no los de tipos anidados ni anónimos). */
  metodos: MetodoJava[];
}

export interface CampoJava {
  nombre: string;
  /** Tipo base tal como aparece (sin genéricos); null si es primitivo o arreglo. */
  tipo: string | null;
  estatico: boolean;
  linea: number;
}

/** Acceso a un atributo de otra clase, directo (`x.campo`) o por accesor (`x.getCampo()`). Insumo de ATFD. */
export interface AccesoAjeno {
  /** Tipo del receptor tal como aparece en la declaración de la variable o campo. */
  tipoReceptor: string;
  /** Nombre del atributo (para accesores: `getNombre()` → `nombre`). */
  atributo: string;
  linea: number;
}

export interface MetodoJava {
  nombre: string;
  /** Nombre y tipos de los parámetros, p. ej. `PedidoService(boolean)`. */
  firma: string;
  esConstructor: boolean;
  linea: number;
  /** Complejidad ciclomática de McCabe (ver docs/caso-prueba-esperado.md para la convención). */
  cc: number;
  /** Atributos propios que el método usa (lectura o escritura). */
  atributosUsados: string[];
  /** Nombres de métodos propios invocados (`m()` o `this.m()`). */
  llamadasPropias: string[];
  accesosAjenos: AccesoAjeno[];
}

export interface MetricasMetodo {
  firma: string;
  linea: number;
  cc: number;
  esConstructor: boolean;
  /** Atributos propios que usa (sirve para sugerir cómo dividir una clase). */
  atributosUsados: string[];
}

export interface MetricasClase {
  /** Weighted Methods per Class: suma de la CC de todos los métodos y constructores. */
  wmc: number;
  numMetodos: number;
  numAtributos: number;
  fanIn: number;
  fanOut: number;
  /** Clases del proyecto acopladas en cualquier dirección (entrantes ∪ salientes). */
  cbo: number;
  /** Access To Foreign Data (aproximado, ver docs/arquitectura.md). */
  atfd: number;
  /** Tight Class Cohesion; null si hay menos de 2 métodos. */
  tcc: number | null;
  lcom: {
    /** Chidamber-Kemerer: max(P − Q, 0). */
    ck: number;
    /** Hitz-Montazeri: componentes conexos de métodos (atributo compartido o llamada). */
    lcom4: number;
    /** Henderson-Sellers (LCOM*); null si no hay atributos o hay menos de 2 métodos. */
    hs: number | null;
  };
  metodos: MetricasMetodo[];
}

export interface ArchivoJava {
  ruta: string;
  paquete: string;
  imports: ImportJava[];
  tipos: TipoDeclarado[];
  /** Errores de sintaxis reportados por tree-sitter (línea del primer nodo ERROR/MISSING). */
  erroresSintaxis: number[];
}

export interface Evidencia {
  uso: UsoDeTipo;
  linea: number;
  /** Nombre tal como aparece en el código. */
  nombre: string;
}

export interface AristaClase {
  origen: string;
  destino: string;
  evidencias: Evidencia[];
}

export interface AristaPaquete {
  origen: string;
  destino: string;
  /** Número de aristas de clases agregadas en esta arista de paquetes. */
  peso: number;
}

export interface Grafo<A> {
  nodos: string[];
  aristas: A[];
}

export interface ResultadoCiclos {
  /** Componentes fuertemente conexos de tamaño > 1 (cada uno ordenado). */
  componentes: string[][];
  /** Ciclos elementales; cada uno empieza en su nodo menor y NO repite el nodo inicial al final. */
  ciclosElementales: string[][];
  /** true si la enumeración de ciclos se detuvo al alcanzar el límite. */
  truncado: boolean;
}

export interface NodoClase {
  id: string;
  nombreSimple: string;
  paquete: string;
  clase: ClaseDeTipo;
  archivo: string;
  linea: number;
  /** Clases del proyecto de las que depende (salientes). */
  dependencias: string[];
  /** Clases del proyecto que dependen de ella (entrantes). */
  dependientes: string[];
  metricas: MetricasClase;
}

export interface Advertencia {
  archivo: string;
  linea?: number;
  mensaje: string;
}

export interface ResultadoAnalisis {
  herramienta: { nombre: string; version: string };
  raiz: string;
  archivosAnalizados: number;
  clases: NodoClase[];
  grafoClases: Grafo<AristaClase>;
  grafoPaquetes: Grafo<AristaPaquete>;
  ciclos: {
    clases: ResultadoCiclos;
    paquetes: ResultadoCiclos;
  };
  /** Configuración de reglas con la que se generaron las recomendaciones (umbrales y fuentes). */
  configuracion: ConfiguracionReglas;
  recomendaciones: Recomendacion[];
  advertencias: Advertencia[];
}

export interface Ubicacion {
  archivo: string;
  linea: number;
}

/** Una condición de una regla evaluada sobre una entidad: métrica, valor medido y umbral con su fuente. */
export interface CondicionEvaluada {
  metrica: string;
  valor: number | null;
  operador: '>' | '>=' | '<';
  umbral: number;
  fuente: string;
  cumple: boolean;
}

/** Recomendación trazable: problema, métricas, valores medidos, umbrales excedidos y refactorización sugerida. */
export interface Recomendacion {
  regla: IdRegla;
  nombreRegla: string;
  /** false para las reglas que solo sirven de comparación (R3-A). */
  principal: boolean;
  entidad: {
    tipo: 'metodo' | 'clase' | 'ciclo-clases' | 'ciclo-paquetes';
    /** Clase, Clase.firma o la lista de miembros del componente. */
    id: string;
    ubicaciones: Ubicacion[];
  };
  problema: string;
  condiciones: CondicionEvaluada[];
  refactorizaciones: string[];
  /** Información de apoyo (ciclos, dependencia sugerida para empezar, uso de atributos). */
  detalles: string[];
}
