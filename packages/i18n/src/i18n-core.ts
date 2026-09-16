// Shared core for @tryghost/i18n, used by both the Node entry (src/index.ts)
// and the browser registry entries (src/registry/*.ts).
//
// Must stay free of Node built-ins: the browser build pulls this file into a UMD
// bundle, so anything touching `fs` here breaks that bundle at load. Node-only
// concerns live in ./file-loader.ts and ./theme-resources.ts, which the browser
// graph never imports.
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

// i18next types `services.languageUtils` as `any`. Only the resolution hierarchy
// is needed here: for a requested language it returns every code i18next will
// consult, in order (e.g. 'de-CH' -> ['de-CH', 'de', 'en'], 'no' -> ['no', 'nb', 'en']).
interface LanguageUtils {
  toResolveHierarchy(code: string): string[];
}

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
    // Load a locale's strings the first time i18next is about to resolve against
    // it, rather than loading all of SUPPORTED_LOCALES up front. `languageChanging`
    // fires before i18next resolves the language — on init and on every
    // changeLanguage() — so the bundles are in place by the time it needs them,
    // and an instance only ever reads the locale it is actually using (plus
    // whatever that locale falls back to).
    const loadLanguage = (language: string) => {
      const languageUtils = i18nextInstance.services.languageUtils as LanguageUtils;

      for (const code of languageUtils.toResolveHierarchy(language)) {
        // Anything outside SUPPORTED_LOCALES has no files to load; i18next's own
        // fallback chain takes it to English, exactly as before.
        if (!SUPPORTED_LOCALES.includes(code) || i18nextInstance.hasResourceBundle(code, ns)) {
          continue;
        }

        // Iterated rather than indexed by `code`: the generator decides what it
        // returns, and a locale it has nothing for is simply left out of the store
        // for i18next's fallback chain to handle.
        for (const [locale, byNamespace] of Object.entries(generateResources([code], ns))) {
          i18nextInstance.addResourceBundle(locale, ns, byNamespace[ns]);
        }
      }
    };

    let resources: Resources;
    if (ns !== 'theme') {
      // Starts empty and is filled by loadLanguage. It still has to be an object:
      // i18next only initialises synchronously when `resources` is set.
      resources = {};
      i18nextInstance.on('languageChanging', loadLanguage);
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
