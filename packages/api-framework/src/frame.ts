import createDebug from '@tryghost/debug';
import _ from 'lodash';

export type Dictionary = Record<string, unknown>;

export interface FrameInput extends Dictionary {
  body?: Dictionary;
  context?: Dictionary;
  file?: unknown;
  files?: unknown[];
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

/** Holds all information associated with an API request. */
export class Frame {
  #headers: Record<string, string> = {};

  original: FrameInput;
  options: Dictionary & { context?: Dictionary } = {};
  data: Dictionary = {};
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

  configure(apiConfig: FrameConfiguration) {
    debug('configure');
    let optionNames = apiConfig.options;
    if (typeof optionNames === 'function') {
      optionNames = optionNames(this);
    }
    if (Array.isArray(optionNames)) {
      Object.assign(this.options, _.pick(this.original.query, optionNames));
      Object.assign(this.options, _.pick(this.original.params, optionNames));
      Object.assign(this.options, _.pick(this.original.options, optionNames));
    }
    this.options.context = this.original.context;

    if (this.original.body && Object.keys(this.original.body).length) {
      this.data = _.cloneDeep(this.original.body);
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
    debug('original', this.original);
    debug('options', this.options);
    debug('data', this.data);
  }

  setHeader(header: string, value: string) {
    this.#headers[header] = value;
  }

  getHeaders() {
    return { ...this.#headers };
  }
}

export default Frame;
