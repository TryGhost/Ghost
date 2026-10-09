import { JSDOM } from 'jsdom';

type BrowserEnvironmentOptions = {
  url?: string;
  referrer?: string;
  html?: string;
  runScripts?: boolean;
};

export function createBrowserEnvironment(options: BrowserEnvironmentOptions = {}) {
  const {
    url = 'https://example.com',
    referrer = 'https://referrer.com',
    html = '<!DOCTYPE html><html><body></body></html>',
    runScripts = true,
  } = options;

  // Create JSDOM instance
  const dom = new JSDOM(html, {
    url,
    referrer,
    contentType: 'text/html',
    includeNodeLocations: true,
    runScripts: runScripts ? 'dangerously' : 'outside-only',
    resources: 'usable',
  });

  const window = dom.window;
  const document = window.document;

  // Create a storage mock
  function createStorageMock(): Storage {
    const entries = new Map<string, string>();
    return {
      get length() {
        return entries.size;
      },
      key(index: number) {
        return [...entries.keys()][index] ?? null;
      },
      getItem(key: string) {
        return entries.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        entries.set(key, value);
      },
      removeItem(key: string) {
        entries.delete(key);
      },
      clear() {
        entries.clear();
      },
    };
  }

  // Mock localStorage
  const localStorageMock = createStorageMock();
  const sessionStorageMock = createStorageMock();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    configurable: true,
  });

  // Mock crypto for UUID generation
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
    configurable: true,
  });

  // Track the last XMLHttpRequest instance
  let lastXHR: MockXMLHttpRequest | null = null;

  // Mock XMLHttpRequest
  class MockXMLHttpRequest {
    static readonly UNSENT = 0;
    static readonly OPENED = 1;
    static readonly HEADERS_RECEIVED = 2;
    static readonly LOADING = 3;
    static readonly DONE = 4;

    readyState = 0;
    status = 0;
    responseText = '';
    onreadystatechange: (() => void) | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    _data: Document | XMLHttpRequestBodyInit | null = null;
    method: string | null = null;
    url: string | null = null;
    async: boolean | null = null;
    requestHeaders: Record<string, string> = {};

    constructor() {
      // Store this instance as the last one created
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      lastXHR = this;
    }

    open(method: string, _url: string, async: boolean) {
      this.method = method;
      this.url = _url;
      this.async = async;
      this.readyState = 1;
      if (this.onreadystatechange) {
        this.onreadystatechange();
      }
    }

    setRequestHeader(header: string, value: string) {
      this.requestHeaders[header] = value;
    }

    send(data: Document | XMLHttpRequestBodyInit | null = null) {
      this._data = data;
      this.readyState = 4;
      this.status = 200;
      this.responseText = '{"success":true}';
      if (this.onreadystatechange) {
        this.onreadystatechange();
      }
      if (this.onload) {
        this.onload();
      }
    }
  }

  // Replace the global XMLHttpRequest
  Object.defineProperty(window, 'XMLHttpRequest', {
    value: MockXMLHttpRequest,
    configurable: true,
  });

  // Mock Intl.DateTimeFormat
  Object.defineProperty(window, 'Intl', {
    value: {
      DateTimeFormat: () => ({
        resolvedOptions: () => ({
          timeZone: 'America/New_York',
          locale: 'en-US',
          calendar: 'gregory',
          numberingSystem: 'latn',
        }),
      }),
    },
    configurable: true,
  });

  // Mock navigator
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Test Browser)',
      languages: ['en-US', 'en'],
      language: 'en-US',
      userLanguage: 'en-US',
      browserLanguage: 'en-US',
    },
    configurable: true,
  });

  // Mock history API
  Object.defineProperty(window, 'history', {
    value: {
      pushState: function () {},
      replaceState: function () {},
    },
    configurable: true,
  });

  // Mock document.visibilityState
  Object.defineProperty(document, 'visibilityState', {
    get: function () {
      return 'visible';
    },
  });

  return {
    dom,
    window,
    document,
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    XMLHttpRequest: window.XMLHttpRequest,
    lastXHR: () => lastXHR,
  };
}

type LoadScriptOptions = {
  dataAttributes?: Record<string, string>;
};

/** Loads a script into the JSDOM environment. */
export function loadScript(
  env: ReturnType<typeof createBrowserEnvironment>,
  scriptContent: string,
  options: LoadScriptOptions = {},
): void {
  const { dataAttributes = {} } = options;

  const scriptElement = env.document.createElement('script');
  Object.entries(dataAttributes).forEach(([key, value]) => {
    scriptElement.setAttribute(`data-${key}`, value);
  });
  scriptElement.textContent = scriptContent;
  env.document.body.appendChild(scriptElement);
}
