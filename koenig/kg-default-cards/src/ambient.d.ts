declare module 'simple-dom' {
    export class Document {
        createElement(tagName: string): Element;
        createTextNode(text: string): Node;
        createRawHTMLSection(html: string): Node;
        createComment(text: string): Node;
    }

    export class HTMLSerializer {
        constructor(voidMap: Record<string, boolean>);
        serialize(node: Node): string;
    }

    export const voidMap: Record<string, boolean>;

    export interface Node {
        appendChild(child: Node): void;
        setAttribute(name: string, value: string | number): void;
        getAttribute(name: string): string | null;
        tagName: string;
    }

    export type Element = Node;
}

declare module '@tryghost/kg-markdown-html-renderer' {
    export function render(markdown: string, options?: unknown): string;
}

declare module '@tryghost/string' {
    export function escapeHtml(str: string): string;
}

declare module '@tryghost/url-utils/lib/utils' {
    export function absoluteToRelative(url: string, siteUrl: string, options?: unknown): string;
    export function relativeToAbsolute(url: string, siteUrl: string, itemUrl: string, options?: unknown): string;
    export function toTransformReady(url: string, siteUrl: string, ...args: unknown[]): string;
    export function htmlAbsoluteToRelative(html: string, siteUrl: string, options?: unknown): string;
    export function htmlRelativeToAbsolute(html: string, siteUrl: string, itemUrl: string, options?: unknown): string;
    export function htmlToTransformReady(html: string, siteUrl: string, ...args: unknown[]): string;
    export function markdownAbsoluteToRelative(md: string, siteUrl: string, options?: unknown): string;
    export function markdownRelativeToAbsolute(md: string, siteUrl: string, itemUrl: string, options?: unknown): string;
    export function markdownToTransformReady(md: string, siteUrl: string, options?: unknown): string;
}

declare module '@tryghost/kg-utils' {
    export function slugify(text: string, options?: { ghostVersion?: string }): string;
}

declare module 'luxon' {
    interface DateTimeFormatOptions {
        [key: string]: unknown;
    }

    class DateTime {
        static fromISO(text: string): DateTime;
        static readonly TIME_SIMPLE: DateTimeFormatOptions;
        static readonly DATE_MED: DateTimeFormatOptions;
        toLocaleString(formatOpts?: DateTimeFormatOptions): string;
    }
}

declare module 'juice' {
    function juice(html: string): string;
    export = juice;
}
