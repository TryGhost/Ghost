import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions, ExportDOMOutput} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';

export type AddonResourcePolicy = {
    images?: string[];
    media?: string[];
};

export type AddonNodeData = {
    id: string;
    addonHandle: string;
    blockName: string;
    label: string;
    props: Record<string, unknown>;
    html: string;
    css: string;
    portableHtml: string;
    resourceOrigins: string[];
    resourcePolicy?: AddonResourcePolicy;
    hydrate?: boolean;
    initialHeight: number;
};

export const MAX_ADDON_SNAPSHOT_BYTES = 1024 * 1024;
export const MIN_ADDON_HEIGHT = 80;
export const MAX_ADDON_HEIGHT = 20_000;
const BLOCKED_ELEMENTS = 'script,iframe,object,embed,base,link,meta,template';
const BOOTSTRAP_NONCE = 'ghost-addon-bootstrap';

function isJsonCompatible(value: unknown, ancestors = new WeakSet<object>()): boolean {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (!value || typeof value !== 'object') {
        return false;
    }
    if (ancestors.has(value)) {
        return false;
    }

    ancestors.add(value);
    let compatible: boolean;
    if (Array.isArray(value)) {
        compatible = value.every(item => isJsonCompatible(item, ancestors));
    } else if (Object.prototype.toString.call(value) === '[object Object]'
        && Object.getOwnPropertySymbols(value).length === 0
        && Object.getOwnPropertyNames(value).length === Object.keys(value).length) {
        compatible = Object.values(value).every(item => isJsonCompatible(item, ancestors));
    } else {
        compatible = false;
    }
    ancestors.delete(value);
    return compatible;
}

function hasSafeProperties(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !isJsonCompatible(value)) {
        return false;
    }
    try {
        const serialized = JSON.stringify(value);
        return typeof serialized === 'string' && new TextEncoder().encode(serialized).byteLength <= MAX_ADDON_SNAPSHOT_BYTES;
    } catch {
        return false;
    }
}

function hasSafeResourcePolicy(value: unknown): value is AddonResourcePolicy {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const policy = value as Record<string, unknown>;
    const allowedKeys = new Set(['images', 'media']);
    return Object.keys(policy).every(key => allowedKeys.has(key)
        && Array.isArray(policy[key])
        && policy[key].every(source => typeof source === 'string'));
}

const STATIC_FRAME_BOOTSTRAP = `(function (instanceId, blockName, serializedProps, shouldHydrate) {
    var connected = false;
    var attempts = 0;
    var retryTimer;
    var hydrationStarted = false;
    var props = {};
    try {
        props = JSON.parse(serializedProps);
    } catch (error) {
        props = {};
    }
    var navigationToken = Array.prototype.map.call(window.crypto.getRandomValues(new Uint32Array(4)), function (value) {
        return value.toString(16).padStart(8, '0');
    }).join('');
    var postToParent = window.parent.postMessage.bind(window.parent);
    var sendResize = function (height) {
        postToParent({type: 'ghost-addon', instanceId: instanceId, action: 'resize', height: height}, '*');
    };
    var sendReady = function () {
        postToParent({type: 'ghost-addon', instanceId: instanceId, action: 'ready', navigationToken: navigationToken}, '*');
    };
    var sendNavigate = function (href) {
        postToParent({type: 'ghost-addon', instanceId: instanceId, action: 'navigate', href: href, navigationToken: navigationToken}, '*');
    };
    var sendHydrationState = function (action) {
        postToParent({type: 'ghost-addon', instanceId: instanceId, action: action}, '*');
    };
    var applyHostTypography = function (message) {
        if (typeof message.fontFamily === 'string' && message.fontFamily.length > 0 && message.fontFamily.length <= 512) {
            document.documentElement.style.fontFamily = message.fontFamily;
        }
    };
    var measure = function () {
        var root = document.getElementById('ghost-addon-root');
        var height = root
            ? Math.ceil(Math.max(root.scrollHeight, root.getBoundingClientRect().height))
            : Math.ceil(document.body.scrollHeight);
        sendResize(height);
    };
    document.addEventListener('click', function (event) {
        var element = event.target instanceof Element ? event.target.closest('a,area') : null;
        if (!event.isTrusted || !element || event.defaultPrevented || event.button !== 0) {
            return;
        }
        event.preventDefault();
        try {
            var href = element.getAttribute('href') || element.getAttribute('xlink:href');
            if (!href) {
                return;
            }
            var url = new URL(href, document.baseURI);
            if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
                return;
            }
            sendNavigate(url.href);
        } catch (error) {
            return;
        }
    }, true);
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(measure).observe(document.getElementById('ghost-addon-root') || document.body);
    }
    var announce = function () {
        if (connected || attempts >= 40) {
            window.clearInterval(retryTimer);
            return;
        }
        attempts += 1;
        measure();
        sendReady();
    };
    window.addEventListener('message', function (event) {
        var message = event.data;
        if (event.source !== window.parent || !message || message.type !== 'ghost-addon-host' || message.instanceId !== instanceId) {
            return;
        }
        applyHostTypography(message);
        if (message.action === 'connect') {
            measure();
            sendReady();
        }
        if (message.action === 'connected') {
            connected = true;
            window.clearInterval(retryTimer);
        }
        if (message.action === 'hydrate' && shouldHydrate && !hydrationStarted && typeof message.source === 'string' && message.source.length <= 5242880) {
            hydrationStarted = true;
            var root = document.getElementById('ghost-addon-root');
            var contentStyle = document.querySelector('style[data-ghost-addon-content-style]');
            var fallbackMarkup = root ? root.innerHTML : '';
            var fallbackCss = contentStyle ? contentStyle.textContent : '';
            var failHydration = function () {
                if (root) {
                    root.innerHTML = fallbackMarkup;
                }
                if (contentStyle) {
                    contentStyle.textContent = fallbackCss;
                }
                sendHydrationState('hydrate-error');
                measure();
            };
            try {
                (0, eval)(message.source);
                var moduleExports = window.__ghostAddonModule;
                delete window.__ghostAddonModule;
                var hydrate = typeof moduleExports === 'function'
                    ? moduleExports.hydrate
                    : moduleExports && (moduleExports.hydrate || (moduleExports.default && moduleExports.default.hydrate));
                if (typeof hydrate !== 'function' || !root) {
                    throw new Error('Add-on bundle does not export hydration');
                }
                Promise.resolve(hydrate({blockName: blockName, props: props}, root)).then(function () {
                    sendHydrationState('hydrated');
                    measure();
                }, failHydration);
            } catch (error) {
                failHydration();
            }
        }
    });
    window.addEventListener('load', measure);
    retryTimer = window.setInterval(announce, 250);
    announce();
})`;

export function isSafeAddonSnapshot(node: AddonNodeData): boolean {
    return typeof node.id === 'string'
        && node.id.trim().length > 0
        && node.id.length <= 256
        && typeof node.addonHandle === 'string'
        && node.addonHandle.trim().length > 0
        && node.addonHandle.length <= 256
        && typeof node.blockName === 'string'
        && node.blockName.trim().length > 0
        && node.blockName.length <= 256
        && typeof node.label === 'string'
        && node.label.length <= 200
        && hasSafeProperties(node.props)
        && typeof node.html === 'string'
        && typeof node.css === 'string'
        && typeof node.portableHtml === 'string'
        && Array.isArray(node.resourceOrigins)
        && node.resourceOrigins.every(origin => typeof origin === 'string')
        && (node.resourcePolicy === undefined || hasSafeResourcePolicy(node.resourcePolicy))
        && (node.hydrate === undefined || typeof node.hydrate === 'boolean')
        && new TextEncoder().encode(node.html).byteLength <= MAX_ADDON_SNAPSHOT_BYTES
        && new TextEncoder().encode(node.css).byteLength <= MAX_ADDON_SNAPSHOT_BYTES
        && new TextEncoder().encode(node.portableHtml).byteLength <= MAX_ADDON_SNAPSHOT_BYTES;
}

export function normalizeAddonHeight(value: unknown): number {
    const height = Number(value);
    return Math.max(MIN_ADDON_HEIGHT, Math.min(MAX_ADDON_HEIGHT, Number.isFinite(height) ? height : 320));
}

function isExecutableUrl(value: string): boolean {
    const normalized = [...value].filter(character => character.charCodeAt(0) > 32).join('').toLowerCase();
    return normalized.startsWith('javascript:') || normalized.startsWith('data:text/html');
}

function isUnsafeNavigationUrl(value: string): boolean {
    const normalized = [...value].filter(character => character.charCodeAt(0) > 32).join('');
    try {
        const url = new URL(normalized, 'https://ghost.invalid');
        return !['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
    } catch {
        return true;
    }
}

function sanitizeMarkup(document: Document, markup: string, {allowStyleElements = true} = {}): string {
    const template = document.createElement('template');
    template.innerHTML = markup;

    const blockedElements = allowStyleElements ? BLOCKED_ELEMENTS : `${BLOCKED_ELEMENTS},style`;
    template.content.querySelectorAll(blockedElements).forEach(element => element.remove());
    template.content.querySelectorAll('*').forEach((element) => {
        for (const attribute of [...element.attributes]) {
            const name = attribute.name.toLowerCase();
            if (name.startsWith('on') || name === 'srcdoc') {
                element.removeAttribute(attribute.name);
                continue;
            }

            if (['href', 'action', 'formaction', 'xlink:href'].includes(name) && isUnsafeNavigationUrl(attribute.value)) {
                element.removeAttribute(attribute.name);
                continue;
            }

            if (name === 'src' && isExecutableUrl(attribute.value)) {
                element.removeAttribute(attribute.name);
            }
        }
    });

    return template.innerHTML;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#39;');
}

function serializeScriptValue(value: string): string {
    return JSON.stringify(value)
        .replaceAll('<', '\\u003c')
        .replaceAll('\u2028', '\\u2028')
        .replaceAll('\u2029', '\\u2029');
}

function serializeScriptJson(value: unknown): string {
    try {
        return serializeScriptValue(JSON.stringify(value) ?? '{}');
    } catch {
        return serializeScriptValue('{}');
    }
}

function buildResourceSources(values: string[], {includeData = false, allowHttp = false}: {includeData?: boolean; allowHttp?: boolean} = {}): string {
    const sources = values.flatMap((value) => {
        if (value === 'https:' || (allowHttp && value === 'http:')) {
            return [value];
        }
        try {
            const url = new URL(value);
            return url.protocol === 'https:' || (allowHttp && url.protocol === 'http:') ? [url.origin] : [];
        } catch {
            return [];
        }
    });

    const uniqueSources = [...new Set(sources)];
    return [...(includeData ? ['data:'] : []), ...uniqueSources].join(' ') || '\'none\'';
}

function buildStaticDocument(document: Document, node: AddonNodeData, {includeBootstrap = true, enableHydration = true} = {}): string {
    const markup = sanitizeMarkup(document, node.html);
    // A style element is a raw-text element. CSS-escaping `<` prevents a
    // provider string from terminating it and injecting executable markup.
    const css = node.css.replaceAll('<', '\\3c ');
    const title = escapeHtml(node.label || node.blockName);
    const legacySources = buildResourceSources(node.resourceOrigins, {includeData: true, allowHttp: true});
    const policy = node.resourcePolicy;
    const imageSources = policy ? buildResourceSources(policy.images ?? [], {includeData: true}) : legacySources;
    const mediaSources = policy ? buildResourceSources(policy.media ?? [], {includeData: true}) : legacySources;
    const fontSources = policy ? 'data:' : legacySources;
    const connectSources = policy ? '\'none\'' : legacySources;
    const shouldHydrate = enableHydration && node.hydrate === true;
    const scriptSource = includeBootstrap ? `'nonce-${BOOTSTRAP_NONCE}'${shouldHydrate ? ' \'unsafe-eval\'' : ''}` : '\'none\'';
    const connectSource = shouldHydrate ? connectSources : '\'none\'';

    return '<!doctype html>'
        + '<html><head>'
        + '<meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<meta name="referrer" content="no-referrer">'
        + `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${scriptSource}; style-src 'unsafe-inline'; img-src ${imageSources}; media-src ${mediaSources}; font-src ${fontSources}; connect-src ${connectSource}; frame-src 'none'; form-action 'none'; base-uri 'none'">`
        + `<title>${title}</title>`
        + '<style>html,body{margin:0;padding:0}#ghost-addon-root{display:flow-root}</style>'
        + `<style data-ghost-addon-content-style>${css}</style>`
        + '</head><body>'
        + `<main id="ghost-addon-root">${markup}</main>`
        + (includeBootstrap ? `<script nonce="${BOOTSTRAP_NONCE}" data-ghost-addon-bootstrap>${STATIC_FRAME_BOOTSTRAP}(${serializeScriptValue(node.id)},${serializeScriptValue(node.blockName)},${serializeScriptJson(node.props)},${shouldHydrate});</script>` : '')
        + '</body></html>';
}

export function renderAddonEditorPreview(node: AddonNodeData, options: ExportDOMOptions = {}): string {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    if (!node.html || !isSafeAddonSnapshot(node)) {
        return '';
    }

    return buildStaticDocument(document, node, {enableHydration: false});
}

export function renderAddonNode(node: AddonNodeData, options: ExportDOMOptions = {}): ExportDOMOutput {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    if (!node.html || !isSafeAddonSnapshot(node)) {
        return renderEmptyContainer(document);
    }

    if (options.target === 'email') {
        if (!node.portableHtml) {
            return renderEmptyContainer(document);
        }

        const portableElement = document.createElement('div');
        portableElement.className = 'kg-card kg-addon-card';
        portableElement.innerHTML = sanitizeMarkup(document, node.portableHtml, {allowStyleElements: false});
        return {element: portableElement, type: 'outer'};
    }

    const element = document.createElement('figure');
    element.className = 'kg-card kg-addon-card';
    element.id = `addon-${node.id}`;
    element.dataset.addonId = node.id;
    element.dataset.addonHandle = node.addonHandle;
    element.dataset.addonBlock = node.blockName;
    if (node.hydrate === true) {
        element.dataset.addonHydrate = 'true';
    }

    const iframe = document.createElement('iframe');
    const initialHeight = normalizeAddonHeight(node.initialHeight);
    iframe.className = 'kg-addon-card-frame';
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('title', node.label || node.blockName);
    iframe.setAttribute('height', String(initialHeight));
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('srcdoc', buildStaticDocument(document, node));
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.width = '100%';
    element.append(iframe);

    if (node.portableHtml) {
        const portable = document.createElement('template');
        portable.className = 'kg-addon-card-portable';
        portable.innerHTML = sanitizeMarkup(document, node.portableHtml, {allowStyleElements: false});
        element.append(portable);
    }

    return {element, type: 'outer'};
}
