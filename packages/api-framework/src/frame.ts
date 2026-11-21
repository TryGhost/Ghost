import createDebug from '@tryghost/debug';
import _ from 'lodash';

export type Dictionary = Record<string, unknown>;

export interface FrameValues extends Dictionary {
  id?: string;
}

export interface FrameShape {
  data?: Dictionary;
  options?: Dictionary;
}

type FrameData<TShape extends FrameShape> = TShape extends { data: infer TData extends Dictionary }
  ? TData
  : FrameValues;

type FrameOptions<TShape extends FrameShape> = TShape extends {
  options: infer TOptions extends Dictionary;
}
  ? TOptions
  : FrameValues;

export interface FrameInput extends Dictionary {
  body?: Dictionary;
  context?: Dictionary;
  file?: unknown;
  files?: unknown[];
  ip?: string;
  /** The request's `User-Agent` header */
  userAgent?: string;
  options?: Dictionary;
  params?: Dictionary;
  query?: Dictionary;
  session?: unknown;
  url?: { host: string; pathname: string | null; secure?: boolean };
  user?: unknown;
}

export interface FrameConfiguration {
  data?: Dictionary | string[] | ((frame: Frame) => string[]);
  options?: Dictionary | string[] | ((frame: Frame) => string[]);
}

const debug = createDebug('frame');

/**
 * Options without `context.principal`, which holds session ids and staff
 * details; the other context fields already identify the caller.
 */
export function withoutPrincipal(options: Dictionary): Dictionary {
  const context = options.context as Dictionary | undefined;
  if (!context?.principal) {
    return options;
  }
  return { ...options, context: _.omit(context, 'principal') };
}

/** Holds all information associated with an API request. */
export class Frame<TShape extends FrameShape = FrameShape> {
  #headers: Record<string, string | string[]> = {};

  original: FrameInput;
  options: FrameOptions<TShape> & { context?: Dictionary } = {} as FrameOptions<TShape> & {
    context?: Dictionary;
  };
  data: FrameData<TShape> = {} as FrameData<TShape>;
  user: unknown = {};
  file: unknown = {};
  files: unknown[] = [];
  apiType: string | undefined | null = null;
  docName: string | null | undefined = null;
  method: string | null = null;
  response: unknown = null;

  constructor(obj: FrameInput = {}) {
    this.original = obj;
  }

  configure(apiConfig: FrameConfiguration, { deferBodyClone = false } = {}) {
    debug('configure');
    let optionNames = apiConfig.options;
    if (typeof optionNames === 'function') {
      optionNames = optionNames(this);
    }
    if (Array.isArray(optionNames)) {
      Object.assign(this.options, _.pick(this.original.query, optionNames));
      Object.assign(this.options, _.pick(this.original.params, optionNames));
      Object.assign(this.options, _.pick(this.original.options, optionNames));
      // The request's IP, never one the client sent
      if (optionNames.includes('ip') && Object.hasOwn(this.original, 'ip')) {
        this.options.ip = this.original.ip;
      }
      if (optionNames.includes('userAgent')) {
        this.options.userAgent = this.original.userAgent;
      }
    }
    this.options.context = this.original.context;

    const body = this.original.body;
    const hasBody = body && Object.keys(body).length > 0;
    if (hasBody) {
      if (deferBodyClone) {
        // Schema callbacks can use validated input without ever needing a
        // mutable working body. Materialize that copy only on first access.
        const setData = (value: FrameData<TShape>) => {
          Object.defineProperty(this, 'data', {
            value,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        };
        Object.defineProperty(this, 'data', {
          get: () => {
            const data = _.cloneDeep(body) as FrameData<TShape>;
            setData(data);
            return data;
          },
          set: setData,
          enumerable: true,
          configurable: true,
        });
      } else {
        this.data = _.cloneDeep(body) as FrameData<TShape>;
      }
    } else {
      let dataNames = apiConfig.data;
      if (typeof dataNames === 'function') {
        dataNames = dataNames(this);
      }
      if (Array.isArray(dataNames)) {
        Object.assign(this.data, _.pick(this.original.query, dataNames));
        Object.assign(this.data, _.pick(this.original.params, dataNames));
        Object.assign(this.data, _.pick(this.original.options, dataNames));
      }
    }

    this.user = this.original.user;
    this.file = this.original.file;
    this.files = this.original.files ?? [];
    debug('original', withoutPrincipal(this.original));
    debug('options', withoutPrincipal(this.options));
    debug('data', hasBody ? body : this.data);
  }

  setHeader(header: string, value: string | string[]) {
    this.#headers[header] = value;
  }

  getHeaders() {
    return { ...this.#headers };
  }
}

export default Frame;
