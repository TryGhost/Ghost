/// <reference types="vite/client" />

/** Build-time define (vite.config.ts); absent in the embed target. */
declare const SUPERPORTAL_VERSION: string;

interface Window {
    __superportalAssetUrl?: (url: string) => string;
}

declare module '*.css?inline' {
    const css: string;
    export default css;
}
