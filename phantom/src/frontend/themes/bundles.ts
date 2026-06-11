import type {ThemeBundle} from './types.js';

// Platform boundary for loading precompiled theme bundles. Node resolves
// bundle.mjs files (and compiles theme source as a dev fallback); Workers
// statically imports bundles into the build (no runtime code evaluation).
export type ThemeBundleProvider = {
    // Whether a bundle can be loaded for this theme id.
    has: (themeId: string) => Promise<boolean>;
    load: (themeId: string) => Promise<ThemeBundle>;
};

export const createStaticThemeBundles = (bundles: Record<string, ThemeBundle>): ThemeBundleProvider => {
    return {
        has: async (themeId) => themeId in bundles,
        load: async (themeId) => {
            const bundle = bundles[themeId];
            if (!bundle) {
                throw new Error(`Theme bundle not found: ${themeId}`);
            }
            return bundle;
        }
    };
};
