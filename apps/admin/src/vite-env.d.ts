/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** "1" when the acceptance run targets the Shade settings UI — injected by vitest.acceptance.config.ts from SHADE_SETTINGS. */
    readonly SHADE_SETTINGS?: string;
}

declare module '@tryghost/limit-service'
declare module '@tryghost/nql'
declare module '@tryghost/string' {
    export function slugify(string: string, options?: {requiredChangesOnly?: boolean}): string;
}
declare module '@tryghost/koenig-lexical'
