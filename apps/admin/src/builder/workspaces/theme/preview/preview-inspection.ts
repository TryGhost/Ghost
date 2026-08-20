import {parseEditMarker} from '@tryghost/theme-renderer/markers';

export const PREVIEW_INSPECTION_LIMITS = {
    maxOutlineItems: 100,
    maxTextCharacters: 16 * 1024,
    maxElementTextCharacters: 2 * 1024,
    maxTargetCharacters: 512,
    maxAttributeCharacters: 1_024,
    maxStyleCharacters: 512
} as const;

export type PreviewElementTarget = {
    marker?: string;
    selector?: string;
};

export type PreviewSourceLocation = {
    path: string;
    line: number;
    column: number;
};

export type PreviewOutlineItem = {
    tag: string;
    role: string;
    name: string;
    source: PreviewSourceLocation | null;
    sourceTruncated: boolean;
};

export type PreviewPageInspection = {
    url: string;
    title: string;
    viewport: {width: number; height: number; scrollX: number; scrollY: number};
    outline: PreviewOutlineItem[];
    text: string;
    truncated: {outline: boolean; text: boolean; source: boolean};
};

export type PreviewElementInspection = {
    tag: string;
    role: string;
    accessibleName: string;
    attributes: Record<string, string>;
    box: {x: number; y: number; width: number; height: number};
    styles: Record<string, string>;
    text: string;
    source: PreviewSourceLocation | null;
    truncated: {text: boolean; source: boolean};
};

const outlineSelector = [
    '[role]',
    'header',
    'nav',
    'main',
    'aside',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'a[href]',
    'button',
    'input',
    'select',
    'textarea'
].join(',');

const allowedAttributes = [
    'id',
    'class',
    'role',
    'aria-label',
    'aria-labelledby',
    'href',
    'src',
    'alt',
    'title',
    'type',
    'name',
    'data-edit'
] as const;

const allowedStyles = [
    'display',
    'position',
    'visibility',
    'opacity',
    'color',
    'backgroundColor',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'textAlign',
    'width',
    'height',
    'margin',
    'padding',
    'gap',
    'gridTemplateColumns',
    'flexDirection',
    'justifyContent',
    'alignItems',
    'borderRadius'
] as const;

const implicitRoles: Record<string, string> = {
    A: 'link',
    ASIDE: 'complementary',
    BUTTON: 'button',
    FOOTER: 'contentinfo',
    FORM: 'form',
    HEADER: 'banner',
    MAIN: 'main',
    NAV: 'navigation',
    SELECT: 'combobox',
    TEXTAREA: 'textbox'
};

export class PreviewInspectionError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'PreviewInspectionError';
        this.code = code;
    }
}

function boundedText(value: string, limit: number): {text: string; truncated: boolean} {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return {
        text: normalized.slice(0, limit),
        truncated: normalized.length > limit
    };
}

function visibleText(element: Element): string {
    const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const chunks: string[] = [];
    let node = walker.nextNode();
    while (node) {
        const parent = node.parentElement;
        if (parent && !parent.closest('script,style,noscript,template') && !isInaccessible(parent)) {
            chunks.push(node.textContent ?? '');
        }
        node = walker.nextNode();
    }
    return chunks.join(' ');
}

function sourceLocation(element: Element): {source: PreviewSourceLocation | null; truncated: boolean} {
    const value = element.getAttribute('data-edit');
    const marker = value ? parseEditMarker(value) : null;
    if (!marker || !Number.isSafeInteger(marker.line) || marker.line < 1 || !Number.isSafeInteger(marker.column) || marker.column < 1) {
        return {source: null, truncated: false};
    }
    return {
        source: {path: marker.file.slice(0, PREVIEW_INSPECTION_LIMITS.maxTargetCharacters), line: marker.line, column: marker.column},
        truncated: marker.file.length > PREVIEW_INSPECTION_LIMITS.maxTargetCharacters
    };
}

function inputRole(element: Element): string {
    const type = (element.getAttribute('type') || 'text').toLowerCase();
    if (['button', 'image', 'reset', 'submit'].includes(type)) {
        return 'button';
    }
    if (type === 'checkbox') {
        return 'checkbox';
    }
    if (type === 'radio') {
        return 'radio';
    }
    if (type === 'range') {
        return 'slider';
    }
    if (type === 'number') {
        return 'spinbutton';
    }
    if (type === 'search') {
        return 'searchbox';
    }
    if (type === 'hidden') {
        return '';
    }
    return 'textbox';
}

function role(element: Element): string {
    const explicit = element.getAttribute('role')?.trim();
    if (explicit) {
        return explicit.slice(0, 64);
    }
    if (/^H[1-6]$/.test(element.tagName)) {
        return 'heading';
    }
    if (element.tagName === 'A' && !element.hasAttribute('href')) {
        return '';
    }
    if (element.tagName === 'INPUT') {
        return inputRole(element);
    }
    if (element.tagName === 'SELECT' && (element.hasAttribute('multiple') || Number(element.getAttribute('size')) > 1)) {
        return 'listbox';
    }
    return implicitRoles[element.tagName] ?? '';
}

function labelledByText(element: Element): string {
    const document = element.ownerDocument;
    return (element.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .map(id => document.getElementById(id)?.textContent ?? '')
        .join(' ');
}

function nativeLabelText(element: Element): string {
    const labels = (element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).labels;
    return labels ? Array.from(labels).map(label => label.textContent ?? '').join(' ') : '';
}

function hiddenForName(element: Element): boolean {
    const styles = elementStyles(element);
    return element.hasAttribute('hidden')
        || element.getAttribute('aria-hidden') === 'true'
        || styles?.display === 'none'
        || styles?.visibility === 'hidden'
        || styles?.visibility === 'collapse';
}

function descendantName(element: Element): string {
    return Array.from(element.childNodes).map((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent ?? '';
        }
        if (!(node instanceof Element) || hiddenForName(node)) {
            return '';
        }
        return node.getAttribute('aria-label') || node.getAttribute('alt') || descendantName(node);
    }).join(' ');
}

function accessibleName(element: Element): string {
    const inputType = (element.getAttribute('type') || '').toLowerCase();
    const inputValue = element.tagName === 'INPUT' && ['button', 'reset', 'submit'].includes(inputType) ? element.getAttribute('value') : null;
    const direct = element.getAttribute('aria-label')
        || labelledByText(element)
        || nativeLabelText(element)
        || element.getAttribute('alt')
        || element.getAttribute('title')
        || inputValue
        || descendantName(element)
        || '';
    return boundedText(direct, 256).text;
}

function elementWindow(element: Element): Window | null {
    return element.ownerDocument.defaultView;
}

function elementStyles(element: Element): CSSStyleDeclaration | null {
    return elementWindow(element)?.getComputedStyle(element) ?? (element as HTMLElement).style ?? null;
}

function isInaccessible(element: Element): boolean {
    let current: Element | null = element;
    while (current) {
        if (current.hasAttribute('hidden') || current.hasAttribute('inert') || current.getAttribute('aria-hidden') === 'true') {
            return true;
        }
        const styles = elementStyles(current);
        if (styles?.display === 'none' || styles?.visibility === 'hidden' || styles?.visibility === 'collapse') {
            return true;
        }
        current = current.parentElement;
    }
    return false;
}

export function resolvePreviewElement(document: Document, target: PreviewElementTarget): Element {
    const hasMarker = typeof target.marker === 'string' && target.marker.length > 0;
    const hasSelector = typeof target.selector === 'string' && target.selector.length > 0;
    if (hasMarker === hasSelector) {
        throw new PreviewInspectionError('invalid_preview_target', 'Provide exactly one source marker or preview selector.');
    }
    const value = hasMarker ? target.marker as string : target.selector as string;
    if (value.length > PREVIEW_INSPECTION_LIMITS.maxTargetCharacters) {
        throw new PreviewInspectionError('preview_target_too_large', `Preview targets must stay under ${PREVIEW_INSPECTION_LIMITS.maxTargetCharacters} characters.`);
    }
    let element: Element | null = null;
    if (hasMarker) {
        element = Array.from(document.querySelectorAll('[data-edit]')).find(candidate => candidate.getAttribute('data-edit') === value) ?? null;
    } else {
        try {
            element = document.querySelector(value);
        } catch {
            throw new PreviewInspectionError('invalid_preview_selector', 'The preview selector is invalid.');
        }
    }
    if (!element) {
        throw new PreviewInspectionError('preview_element_not_found', `No preview element matches the ${hasMarker ? 'source marker' : 'selector'}.`);
    }
    if (isInaccessible(element)) {
        throw new PreviewInspectionError('preview_element_inaccessible', 'The matching preview element is hidden or inaccessible.');
    }
    return element;
}

export function inspectPreviewPage(document: Document, url: string): PreviewPageInspection {
    const candidates = Array.from(document.querySelectorAll(outlineSelector)).filter(element => !isInaccessible(element));
    const visible = candidates.slice(0, PREVIEW_INSPECTION_LIMITS.maxOutlineItems);
    const pageText = boundedText(document.body ? visibleText(document.body) : '', PREVIEW_INSPECTION_LIMITS.maxTextCharacters);
    const frame = document.defaultView;
    const outline = visible.map((element) => {
        const source = sourceLocation(element);
        return {
            tag: element.tagName.toLowerCase(),
            role: role(element),
            name: accessibleName(element),
            source: source.source,
            sourceTruncated: source.truncated
        };
    });
    return {
        url,
        title: boundedText(document.title, 512).text,
        viewport: {
            width: frame?.innerWidth ?? document.documentElement.clientWidth,
            height: frame?.innerHeight ?? document.documentElement.clientHeight,
            scrollX: frame?.scrollX ?? 0,
            scrollY: frame?.scrollY ?? 0
        },
        outline,
        text: pageText.text,
        truncated: {outline: candidates.length > visible.length, text: pageText.truncated, source: outline.some(item => item.sourceTruncated)}
    };
}

export function inspectPreviewElement(document: Document, target: PreviewElementTarget): PreviewElementInspection {
    const element = resolvePreviewElement(document, target);
    const attributes = Object.fromEntries(allowedAttributes.flatMap((name) => {
        const value = element.getAttribute(name);
        return value === null ? [] : [[name, value.slice(0, PREVIEW_INSPECTION_LIMITS.maxAttributeCharacters)]];
    }));
    const computed = elementStyles(element);
    const styles = Object.fromEntries(allowedStyles.flatMap((name) => {
        const value = computed?.[name];
        return value ? [[name, value.slice(0, PREVIEW_INSPECTION_LIMITS.maxStyleCharacters)]] : [];
    }));
    const bounds = element.getBoundingClientRect();
    const elementText = boundedText(visibleText(element), PREVIEW_INSPECTION_LIMITS.maxElementTextCharacters);
    const source = sourceLocation(element);
    return {
        tag: element.tagName.toLowerCase(),
        role: role(element),
        accessibleName: accessibleName(element),
        attributes,
        box: {x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height},
        styles,
        text: elementText.text,
        source: source.source,
        truncated: {text: elementText.truncated, source: source.truncated}
    };
}
