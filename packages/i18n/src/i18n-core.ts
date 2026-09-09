// Shared core for @tryghost/i18n, used by both the Node entry (src/index.ts)
// and the browser registry entries (src/registry/*.ts).
//
// Must stay import-only: the browser build pulls this file into a UMD bundle, so
// any `require(...)` here leaks into that bundle and throws at load. Node-only
// concerns live in ./require-loader.ts and ./theme-resources.ts, which the
// browser graph never imports.
import i18next from 'i18next';

import localeData from './locale-data.json' with { type: 'json' };
import type {
  GenerateResources,
  GenerateThemeResources,
  I18nOptions,
  LocaleDataEntry,
  Namespace,
  ResourceLoader,
  Resources,
  TranslationResource,
} from './types.ts';

// Locale data loaded from JSON (single source of truth)
export const LOCALE_DATA: LocaleDataEntry[] = localeData;

// Export just the locale codes for backward compatibility
export const SUPPORTED_LOCALES: string[] = LOCALE_DATA.map((locale) => locale.code);

// Merge quirk preserved verbatim from the original implementation:
// Note: due some random thing in TypeScript, 'requiring' a JSON file with a space in a key name, only adds it to the default export
// If changing this behaviour, please also check the comments and signup-form apps in another language (mainly sentences with a space in them)
export function mergeDefaultExport(res: TranslationResource): TranslationResource {
  const nested = res.default;
  return {
    ...res,
    ...(nested && typeof nested === 'object' ? (nested as TranslationResource) : {}),
  };
}

// Factory: given a resource loader, produce a `generateResources(locales, ns)` fn
// with the exact original behaviour/shape.
export function createGenerateResources(loadResource: ResourceLoader): GenerateResources {
  return function generateResources(locales, ns) {
    return locales.reduce<Resources>((acc, locale) => {
      let res = loadResource(locale, ns);
      // Fallback to English if a locale/namespace pair is missing entirely.
      if (res === undefined) {
        res = loadResource('en', ns);
      }
      // English floor: if even English is missing for this namespace, use an
      // empty object so the promised English fallback never lets
      // mergeDefaultExport receive undefined (which would throw).
      acc[locale] = {
        [ns]: mergeDefaultExport(res ?? {}),
      };
      return acc;
    }, {});
  };
}

export function createI18n({
  generateThemeResources,
  generateResources,
}: {
  generateThemeResources: GenerateThemeResources;
  generateResources: GenerateResources;
}) {
  return (lng = 'en', ns: Namespace | string = 'portal', options: I18nOptions = {}) => {
    const i18nextInstance = i18next.createInstance();
    const interpolation: { prefix: string; suffix: string; escapeValue?: boolean } = {
      prefix: '{',
      suffix: '}',
    };
    if (ns === 'theme' || ns === 'portal') {
      interpolation.escapeValue = false;
    }
    let resources: Resources;
    if (ns !== 'theme') {
      resources = generateResources(SUPPORTED_LOCALES, ns);
    } else {
      resources = generateThemeResources(lng, options);
    }

    i18nextInstance.init({
      lng,

      // allow keys to be phrases having `:`, `.`
      nsSeparator: false,
      keySeparator: false,

      // if the value is an empty string, return the key
      returnEmptyString: false,

      // do not load a fallback
      fallbackLng: {
        no: ['nb', 'en'],
        default: ['en'],
      },

      ns: ns,
      defaultNS: ns,

      // separators
      interpolation,

      resources,
    });

    return i18nextInstance;
  };
}
