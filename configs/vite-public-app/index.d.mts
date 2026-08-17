import type {UserConfig} from 'vitest/config';

export interface PublicAppViteConfigOptions {
    /** Absolute root of the calling app (typically `import.meta.dirname`) */
    packageRoot: string;
    /** e.g. `'@tryghost/portal'`; sets the UMD/IIFE global name and output filename */
    packageName: string;
    /** Entry path relative to `packageRoot` (e.g. `'src/index.jsx'`) */
    entry: string;
    /** Controls whether `@vitejs/plugin-react` is included. Default `'react'`. */
    framework?: 'react' | 'preact';
    /** Include `vite-plugin-svgr`. Default `true`. */
    svgr?: boolean;
    /** Default `'umd'`. */
    libFormat?: 'umd' | 'iife';
    /** Global var name override (default: `packageName`). */
    libName?: string;
    /** Default `true`. */
    sourcemap?: boolean;
    /** Default `true`. */
    cssCodeSplit?: boolean;
    /** Deep-merged onto the base config. */
    overrides?: UserConfig;
}

export function publicAppViteConfig(opts: PublicAppViteConfigOptions): UserConfig;
