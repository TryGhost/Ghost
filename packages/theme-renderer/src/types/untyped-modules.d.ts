/* eslint-disable @typescript-eslint/no-explicit-any */
// Ambient declarations for untyped npm dependencies used by the copied
// helper/meta files. All are plain-JS packages without published types.

declare module '@tryghost/helpers' {
    const helpers: any;
    export default helpers;
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

declare module 'downsize-cjs' {
    function downsize(text: string, options?: any): string;
    export default downsize;
}

declare module 'human-number' {
    function humanNumber(value: number, formatter?: (n: number) => string): string;
    export default humanNumber;
}
