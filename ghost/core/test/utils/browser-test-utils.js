const {JSDOM} = require('jsdom');

/**
 * @typedef {Object} BrowserEnvironment
 * @property {import('jsdom').JSDOM} dom - The JSDOM instance
 * @property {import('jsdom').DOMWindow} window - The window object
 * @property {Document} document - The document object
 * @property {Storage} localStorage - Mocked localStorage
 * @property {Storage} sessionStorage - Mocked sessionStorage
 * @property {typeof XMLHttpRequest} XMLHttpRequest - Mocked XMLHttpRequest
 * @property {XMLHttpRequest} lastXHR - The last XMLHttpRequest instance created
 */

/**
 * @typedef {Object} BrowserEnvironmentOptions
 * @property {string} [url='https://example.com'] - The URL to use for the window
 * @property {string} [referrer='https://referrer.com'] - The referrer to use
 * @property {string} [html='<!DOCTYPE html><html><body></body></html>'] - The HTML content
 * @property {boolean} [runScripts=true] - Whether to run scripts
 * @property {Object} [storage] - Storage configuration
 * @property {'localStorage'|'sessionStorage'} [storage.type='localStorage'] - Which storage to use
 */

/**
 * Creates a browser-like environment using JSDOM
 * @param {BrowserEnvironmentOptions} options - Configuration options
 * @returns {BrowserEnvironment} The browser environment
 */
function createBrowserEnvironment(options = {}) {
    const {
        url = 'https://example.com',
        referrer = 'https://referrer.com',
        html = '<!DOCTYPE html><html><body></body></html>',
        runScripts = true
        // storage = {type: 'localStorage'}
    } = options;

    // Create JSDOM instance
    const dom = new JSDOM(html, {
        url,
        referrer,
        contentType: 'text/html',
        includeNodeLocations: true,
        runScripts: runScripts ? 'dangerously' : 'outside-only',
        resources: 'usable'
    });

    const window = dom.window;
    const document = window.document;

    // Create a storage mock
    function createStorageMock() {
        return {
            getItem: function (key) {
                return this[key] || null;
            },
            setItem: function (key, value) {
                this[key] = value;
            },
            removeItem: function (key) {
                delete this[key];
            },
            clear: function () {
                Object.keys(this).forEach((key) => {
                    if (key !== 'getItem' && key !== 'setItem' && key !== 'removeItem' && key !== 'clear') {
                        delete this[key];
                    }
                });
            }
        };
    }

    // Mock localStorage
    const localStorageMock = createStorageMock();
    const sessionStorageMock = createStorageMock();

    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        configurable: true
    });
    
    Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorageMock,
        configurable: true
    });

    // Mock crypto for UUID generation
    Object.defineProperty(window, 'crypto', {
        value: {
            getRandomValues: (arr) => {
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = Math.floor(Math.random() * 256);
                }
                return arr;
            }
        },
        configurable: true
    });

    // Track the last XMLHttpRequest instance
    let lastXHR = null;

    // Mock XMLHttpRequest
    class MockXMLHttpRequest {
        constructor() {
            this.readyState = 0;
            this.status = 0;
            this.responseText = '';
            this.onreadystatechange = null;
            this.onload = null;
            this.onerror = null;
            this._data = null;
            this.method = null;
            this.url = null;
            this.async = null;
            this.requestHeaders = {};
            
            // Store this instance as the last one created
            lastXHR = this;
        }

        open(method, _url, async) {
            this.method = method;
            this.url = _url;
            this.async = async;
            this.readyState = 1;
            if (this.onreadystatechange) {
                this.onreadystatechange();
            }
        }

        setRequestHeader(header, value) {
            this.requestHeaders[header] = value;
        }

        send(data) {
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

    // Add static properties to match XMLHttpRequest
    MockXMLHttpRequest.UNSENT = 0;
    MockXMLHttpRequest.OPENED = 1;
    MockXMLHttpRequest.HEADERS_RECEIVED = 2;
    MockXMLHttpRequest.LOADING = 3;
    MockXMLHttpRequest.DONE = 4;

    // Replace the global XMLHttpRequest
    Object.defineProperty(window, 'XMLHttpRequest', {
        value: MockXMLHttpRequest,
        configurable: true
    });

    // Mock Intl.DateTimeFormat
    Object.defineProperty(window, 'Intl', {
        value: {
            DateTimeFormat: () => ({
                resolvedOptions: () => ({
                    timeZone: 'America/New_York',
                    locale: 'en-US',
                    calendar: 'gregory',
                    numberingSystem: 'latn'
                })
            })
        },
        configurable: true
    });

    // Mock navigator
    Object.defineProperty(window, 'navigator', {
        value: {
            userAgent: 'Mozilla/5.0 (Test Browser)',
            languages: ['en-US', 'en'],
            language: 'en-US',
            userLanguage: 'en-US',
            browserLanguage: 'en-US'
        },
        configurable: true
    });

    // Mock history API
    Object.defineProperty(window, 'history', {
        value: {
            pushState: function () {},
            replaceState: function () {}
        },
        configurable: true
    });

    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
        get: function () {
            return 'visible'; 
        }
    });

    return {
        dom,
        window,
        document,
        localStorage: window.localStorage,
        sessionStorage: window.sessionStorage,
        XMLHttpRequest: window.XMLHttpRequest,
        lastXHR: () => lastXHR
    };
}

/**
 * @typedef {Object} LoadScriptOptions
 * @property {Object} [dataAttributes] - Data attributes to set on the script element
 */

/**
 * Loads a script into the JSDOM environment
 * @param {BrowserEnvironment} env - The browser environment
 * @param {string} scriptContent - The script content to load
 * @param {LoadScriptOptions} [options] - Options for loading the script
 * @returns {void}
 */
function loadScript(env, scriptContent, options = {}) {
    const {dataAttributes = {}} = options;

    // Create a script element with data attributes
    const scriptElement = env.document.createElement('script');
    Object.entries(dataAttributes).forEach(([key, value]) => {
        scriptElement.setAttribute(`data-${key}`, value);
    });
    scriptElement.textContent = scriptContent;
    env.document.body.appendChild(scriptElement);
}

module.exports = {
    createBrowserEnvironment,
    loadScript
}; 