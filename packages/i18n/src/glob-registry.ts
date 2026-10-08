import type { TranslationResource } from './types.ts';

/**
 * Collects a Vite `import.meta.glob` result (path -> resource JSON) into a
 * locale-keyed registry. Kept free of i18next so the light browser factory can
 * share it.
 */
export function registryFromGlob(
  globModules: Record<string, TranslationResource>,
): Record<string, TranslationResource> {
  const registry: Record<string, TranslationResource> = {};
  for (const [filePath, resource] of Object.entries(globModules)) {
    const locale = /\/locales\/([^/]+)\//.exec(filePath)?.[1];
    if (locale) {
      registry[locale] = resource;
    }
  }
  return registry;
}
