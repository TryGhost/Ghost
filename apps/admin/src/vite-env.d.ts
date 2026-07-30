/// <reference types="vite/client" />

declare module '@tryghost/limit-service'
declare module '@tryghost/nql'
declare module '@tryghost/string' {
    export function slugify(string: string, options?: {requiredChangesOnly?: boolean, unicodeSlugs?: boolean, slugSeparator?: string}): string;
}
declare module '@tryghost/koenig-lexical'
