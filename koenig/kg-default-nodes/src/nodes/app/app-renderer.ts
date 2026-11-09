import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions, ExportDOMOutput} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';
import {escapeCss} from './app-card-document.js';

export type AppCardData = {
    appId: string;
    card: string;
    properties: Record<string, unknown>;
    publicProperties: string[];
    html: string;
    css: string;
    height: number;
    emailHtml: string;
};

/**
 * What Ghost knows about a card when it renders email: whether its app is installed and still
 * declares it, and where its images and media may come from now. Ghost core passes it as the
 * `appCards` render option; without it, app cards are left out of email.
 */
export interface AppCardLookup {
    lookup(appId: string, card: string): {imageOrigins: string[]; mediaOrigins: string[]} | null;
}

export const APP_CARD_MAX_BYTES = 1_000_000;
export const APP_CARD_MIN_HEIGHT = 20;
export const APP_CARD_MAX_HEIGHT = 4000;
const APP_ID_MAX_LENGTH = 191;
const APP_ID = /^[a-z][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+$/;
const CARD_NAME = /^[a-z][a-z0-9-]{0,62}$/;
const PROPERTY_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

// Snapshots are static: nothing that runs, frames, fetches or rebases. SVG's animation elements
// go too, as they can rewrite an attribute after it was checked, and `use` can pull in other
// documents. Selectors match SVG's camel-cased names exactly, so both spellings are listed.
const BLOCKED_ELEMENTS = [
    'script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'base', 'link', 'meta', 'template',
    'style', 'form', 'noscript', 'set', 'animate', 'animateTransform', 'animatetransform',
    'animateMotion', 'animatemotion', 'discard', 'use', 'foreignObject', 'foreignobject', 'handler',
    'listener', 'plaintext', 'xmp', 'noembed', 'noframes', 'listing'
].join(',');
const URL_ATTRIBUTES = ['href', 'xlink:href', 'action', 'formaction'];
const SOURCE_ATTRIBUTES = ['src', 'poster', 'data'];

const byteLength = (value: string) => new TextEncoder().encode(value).byteLength;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
        && Object.getPrototypeOf(value) === Object.prototype;
}

/** Whether a saved card keeps to the limits Ghost core checks before saving it. */
export function isValidAppCard(node: Partial<AppCardData>): node is AppCardData {
    try {
        return typeof node.appId === 'string'
            && node.appId.length <= APP_ID_MAX_LENGTH
            && APP_ID.test(node.appId)
            && typeof node.card === 'string'
            && CARD_NAME.test(node.card)
            && isPlainObject(node.properties)
            && byteLength(JSON.stringify(node.properties)) <= APP_CARD_MAX_BYTES
            && Array.isArray(node.publicProperties)
            && node.publicProperties.length <= 100
            && node.publicProperties.every(name => typeof name === 'string' && PROPERTY_NAME.test(name))
            && typeof node.html === 'string'
            && byteLength(node.html) <= APP_CARD_MAX_BYTES
            && typeof node.css === 'string'
            && byteLength(node.css) <= APP_CARD_MAX_BYTES
            && typeof node.emailHtml === 'string'
            && byteLength(node.emailHtml) <= APP_CARD_MAX_BYTES
            && typeof node.height === 'number'
            && Number.isFinite(node.height);
    } catch {
        return false;
    }
}

export function normaliseAppCardHeight(value: unknown): number {
    const height = Number(value);
    return Math.round(Math.max(APP_CARD_MIN_HEIGHT, Math.min(APP_CARD_MAX_HEIGHT, Number.isFinite(height) ? height : 320)));
}

function visibleCharacters(value: string): string {
    return [...value].filter(character => character.charCodeAt(0) > 32).join('');
}

function isSafeLink(value: string): boolean {
    const url = URL.parse(visibleCharacters(value), 'https://ghost.invalid');
    return url !== null && ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
}

function isExecutableSource(value: string): boolean {
    const normalised = visibleCharacters(value).toLowerCase();
    return normalised.startsWith('javascript:') || normalised.startsWith('data:text/html') || normalised.startsWith('vbscript:');
}

/**
 * Takes what could run, frame or rebase out of an app's markup. The snapshot frame's CSP stops
 * the rest on the site; email has no CSP, so its markup also goes through `filterAppCardOrigins`.
 */
export function sanitiseAppCardMarkup(document: Document, markup: string): string {
    const template = document.createElement('template');
    template.innerHTML = markup;
    template.content.querySelectorAll(BLOCKED_ELEMENTS).forEach(element => element.remove());
    template.content.querySelectorAll('*').forEach((element) => {
        for (const attribute of [...element.attributes]) {
            const name = attribute.name.toLowerCase();
            if (name.startsWith('on') || name === 'srcdoc' || name === 'is') {
                element.removeAttribute(attribute.name);
            } else if (URL_ATTRIBUTES.includes(name) && !isSafeLink(attribute.value)) {
                element.removeAttribute(attribute.name);
            } else if ((SOURCE_ATTRIBUTES.includes(name) || name === 'srcset') && isExecutableSource(attribute.value)) {
                element.removeAttribute(attribute.name);
            }
        }
    });
    return template.innerHTML;
}

function isAllowedSource(value: string, allowed: Set<string>, base: string): boolean {
    const url = URL.parse(visibleCharacters(value), base);
    if (!url) {
        return false;
    }
    if (url.protocol === 'data:') {
        return url.href.toLowerCase().startsWith('data:image/');
    }
    return allowed.has(url.origin);
}

/**
 * Drops images and media whose source isn't on an allowed origin, for output with no CSP to do
 * it: email and RSS. Inline styles go too, as CSS can load images of its own.
 */
export function filterAppCardOrigins(document: Document, markup: string, origins: string[], base = 'https://ghost.invalid/'): string {
    const allowed = new Set(origins.map(origin => URL.parse(origin)?.origin).filter((origin): origin is string => Boolean(origin)));
    const template = document.createElement('template');
    template.innerHTML = markup;
    template.content.querySelectorAll('*').forEach((element) => {
        const isLink = element.tagName.toLowerCase() === 'a' || element.tagName.toLowerCase() === 'area';
        for (const attribute of [...element.attributes]) {
            const name = attribute.name.toLowerCase();
            // CSS can load resources in more spellings than a pattern can follow, escapes included,
            // so any style that could name one goes.
            if (name === 'style' && /url|image|@import|\\|src\s*\(/i.test(attribute.value)) {
                element.removeAttribute(attribute.name);
            } else if ((SOURCE_ATTRIBUTES.includes(name) || (!isLink && (name === 'href' || name === 'xlink:href')))
                && !isAllowedSource(attribute.value, allowed, base)) {
                element.removeAttribute(attribute.name);
            } else if (name === 'srcset' || name === 'imagesrcset') {
                const sources = attribute.value.split(',').map(entry => entry.trim().split(/\s+/)[0]).filter(Boolean);
                if (!sources.every(source => isAllowedSource(source, allowed, base))) {
                    element.removeAttribute(attribute.name);
                }
            } else if (name === 'background') {
                element.removeAttribute(attribute.name);
            }
        }
        // An image or media element with nothing left to load is dropped altogether.
        if (['IMG', 'VIDEO', 'AUDIO', 'SOURCE', 'PICTURE'].includes(element.tagName.toUpperCase())
            && !element.getAttribute('src') && !element.getAttribute('srcset') && !element.querySelector('source[src],img[src]')) {
            element.remove();
        }
    });
    return template.innerHTML;
}

/** Points the app's links to "this post" (`data-ghost-post-link`) at the post being rendered. */
export function resolvePostLinks(document: Document, markup: string, postUrl?: string): string {
    const template = document.createElement('template');
    template.innerHTML = markup;
    const url = postUrl ? URL.parse(postUrl) : null;
    const href = url && ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    template.content.querySelectorAll('a[data-ghost-post-link]').forEach((link) => {
        link.removeAttribute('href');
        if (href) {
            link.setAttribute('href', href);
        }
    });
    return template.innerHTML;
}

/** A card with no email version stands in as a link to the post. */
function postLinkFallback(document: Document, postUrl: string | undefined): string {
    if (!postUrl) {
        return '';
    }
    const paragraph = document.createElement('p');
    const link = document.createElement('a');
    link.setAttribute('href', postUrl);
    link.textContent = 'View this on the web';
    paragraph.append(link);
    return paragraph.outerHTML;
}

/** The public properties' values, as JSON safe inside a `<script>` element. */
function publicPropertiesJson(node: AppCardData): string {
    const values: Record<string, unknown> = {};
    for (const name of node.publicProperties) {
        if (Object.prototype.hasOwnProperty.call(node.properties, name)) {
            values[name] = node.properties[name];
        }
    }
    return JSON.stringify(values)
        .replaceAll('<', '\\u003c')
        .replaceAll(' ', '\\u2028')
        .replaceAll(' ', '\\u2029');
}

/**
 * The web output Ghost stores for a card. Nothing in it shows by itself: Ghost core turns the
 * snapshot template into a sandboxed frame when it serves the post, if the card's app is
 * installed and still declares it, under a CSP from the app's manifest at that moment.
 *
 * ```html
 * <figure class="kg-card kg-app-card" data-app-id data-app-card data-app-height>
 *   <template class="kg-app-card-snapshot">…</template>      the web snapshot
 *   <script type="application/json" class="kg-app-card-public">{…}</script>
 *   <template class="kg-app-card-email">…</template>         for RSS
 * </figure>
 * ```
 *
 * For email, it's the email version, if the `appCards` option says the card is available, with
 * images and media from other origins taken out.
 */
export function renderAppNode(node: AppCardData, options: ExportDOMOptions = {}): ExportDOMOutput {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    if (!node.html || !isValidAppCard(node)) {
        return renderEmptyContainer(document);
    }

    if (options.target === 'email') {
        const appCards = options.appCards as AppCardLookup | undefined;
        const available = appCards?.lookup(node.appId, node.card);
        if (!available) {
            return renderEmptyContainer(document);
        }
        let markup = node.emailHtml
            ? sanitiseAppCardMarkup(document, node.emailHtml)
            : postLinkFallback(document, options.postUrl);
        markup = filterAppCardOrigins(document, markup, available.imageOrigins.concat(available.mediaOrigins), options.siteUrl);
        markup = resolvePostLinks(document, markup, options.postUrl);
        if (!markup.trim()) {
            return renderEmptyContainer(document);
        }
        const element = document.createElement('div');
        element.className = 'kg-card kg-app-card';
        element.innerHTML = markup;
        return {element, type: 'outer'};
    }

    const element = document.createElement('figure');
    element.className = 'kg-card kg-app-card';
    element.setAttribute('data-app-id', node.appId);
    element.setAttribute('data-app-card', node.card);
    element.setAttribute('data-app-height', String(normaliseAppCardHeight(node.height)));

    const snapshot = document.createElement('template');
    snapshot.className = 'kg-app-card-snapshot';
    snapshot.innerHTML = `<style>${escapeCss(node.css)}</style>${sanitiseAppCardMarkup(document, node.html)}`;
    element.append(snapshot);

    if (node.publicProperties.length > 0) {
        const script = document.createElement('script');
        script.setAttribute('type', 'application/json');
        script.className = 'kg-app-card-public';
        script.textContent = publicPropertiesJson(node);
        element.append(script);
    }

    const email = document.createElement('template');
    email.className = 'kg-app-card-email';
    email.innerHTML = node.emailHtml ? sanitiseAppCardMarkup(document, node.emailHtml) : '';
    element.append(email);

    return {element, type: 'outer'};
}
