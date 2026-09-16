declare module 'html-minifier' {
    export function minify(html: string, options?: Record<string, unknown>): string;
}
