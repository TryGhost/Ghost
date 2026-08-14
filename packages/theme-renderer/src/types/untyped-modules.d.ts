/* eslint-disable @typescript-eslint/no-explicit-any */
// Ambient declarations for untyped npm dependencies used by the copied
// helper/meta files. All are plain-JS packages without published types.

// Named exports only (no default): the package's `module` entry (es/helpers.js,
// what vite/rollup resolve for the browser bundle) exports {readingTime, tags,
// utils} by name — a default import fails at bundle time, so the copied files
// use `import * as helpers` instead.
declare module '@tryghost/helpers' {
    export const readingTime: any;
    export const tags: any;
    export const utils: any;
}

declare module '@tryghost/nql-lang' {
    const nqlLang: any;
    export default nqlLang;
}

declare module '@tryghost/string' {
    export function slugify(input: string, options?: any): string;
    const string: any;
    export default string;
}

declare module '@tryghost/social-urls' {
    const socialUrls: any;
    export default socialUrls;
}

declare module 'path-to-regexp' {
    interface Key {
        name: string;
        prefix: string;
        delimiter: string;
        optional: boolean;
        repeat: boolean;
        pattern: string;
    }
    function pathToRegexp(path: string, keys?: Key[], options?: any): RegExp;
    export default pathToRegexp;
}

declare module 'downsize-cjs' {
    function downsize(text: string, options?: any): string;
    export default downsize;
}

declare module 'human-number' {
    function humanNumber(value: number, formatter?: (n: number) => string): string;
    export default humanNumber;
}
