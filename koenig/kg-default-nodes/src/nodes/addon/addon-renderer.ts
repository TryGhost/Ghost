import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions, ExportDOMOutput} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';

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
    initialHeight: number;
};

const MAX_SNAPSHOT_BYTES = 1024 * 1024;
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 20_000;
const BLOCKED_ELEMENTS = 'script,iframe,object,embed,base,link,meta,template';
const BOOTSTRAP_NONCE = 'ghost-addon-bootstrap';

const STATIC_FRAME_BOOTSTRAP = `(function (instanceId) {
    var connected = false;
    var attempts = 0;
    var retryTimer;
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
    var measure = function () {
        var height = Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
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
        new ResizeObserver(measure).observe(document.body);
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
        if (message.action === 'connect') {
            measure();
            sendReady();
        }
        if (message.action === 'connected') {
            connected = true;
            window.clearInterval(retryTimer);
        }
    });
    window.addEventListener('load', measure);
    retryTimer = window.setInterval(announce, 250);
    announce();
})`;

function isSafeSnapshot(node: AddonNodeData): boolean {
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
        && typeof node.html === 'string'
        && typeof node.css === 'string'
        && typeof node.portableHtml === 'string'
        && Array.isArray(node.resourceOrigins)
        && node.resourceOrigins.every(origin => typeof origin === 'string')
        && new TextEncoder().encode(node.html).byteLength <= MAX_SNAPSHOT_BYTES
        && new TextEncoder().encode(node.css).byteLength <= MAX_SNAPSHOT_BYTES
        && new TextEncoder().encode(node.portableHtml).byteLength <= MAX_SNAPSHOT_BYTES;
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

function buildResourceSources(resourceOrigins: string[]): string {
    const origins = resourceOrigins.flatMap((value) => {
        try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:' ? [url.origin] : [];
        } catch {
            return [];
        }
    });

    return ['data:', ...new Set(origins)].join(' ');
}

function buildStaticDocument(document: Document, node: AddonNodeData): string {
    const markup = sanitizeMarkup(document, node.html);
    // A style element is a raw-text element. CSS-escaping `<` prevents a
    // provider string from terminating it and injecting executable markup.
    const css = node.css.replaceAll('<', '\\3c ');
    const title = escapeHtml(node.label || node.blockName);
    const resourceSources = buildResourceSources(node.resourceOrigins);

    return '<!doctype html>'
        + '<html><head>'
        + '<meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${BOOTSTRAP_NONCE}'; style-src 'unsafe-inline'; img-src ${resourceSources}; media-src ${resourceSources}; font-src ${resourceSources}; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">`
        + `<title>${title}</title>`
        + `<style>html,body{margin:0;padding:0}#ghost-addon-root{display:flow-root}${css}</style>`
        + '</head><body>'
        + `<main id="ghost-addon-root">${markup}</main>`
        + `<script nonce="${BOOTSTRAP_NONCE}" data-ghost-addon-bootstrap>${STATIC_FRAME_BOOTSTRAP}(${serializeScriptValue(node.id)});</script>`
        + '</body></html>';
}

export function renderAddonNode(node: AddonNodeData, options: ExportDOMOptions = {}): ExportDOMOutput {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    if (!node.html || !isSafeSnapshot(node)) {
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

    const iframe = document.createElement('iframe');
    const initialHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Number(node.initialHeight) || MIN_HEIGHT));
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
