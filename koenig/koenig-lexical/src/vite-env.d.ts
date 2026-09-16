/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare const process: {
    cwd: () => string;
    env: Record<string, string | undefined>;
    platform: string;
};

interface ImportMetaEnv {
    readonly VITE_TEST?: string;
}

declare const __APP_VERSION__: string;

declare module '@tryghost/kg-simplemde';
declare module '@tryghost/helpers' {
    export const utils: {
        countWords(text: string): number;
    };
}
declare module 'pluralize';
declare module 'react-slider';
declare module 'react-highlight';
