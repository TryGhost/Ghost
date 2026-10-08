// i18next-free browser factory for apps that only need key lookup, `{name}` interpolation and
// dir(). Locale resolution, fallback, escaping and direction match ./esm-factory.ts.
import { registryFromGlob } from './glob-registry.ts';
import type {
  InterpolationValues,
  LightI18n,
  LightI18nFactory,
  TranslationResource,
} from './types.ts';

// Copied from i18next's dir().
const RTL_LANGUAGE =
  /^(?:ar|shu|sqr|ssh|xaa|yhd|yud|aao|abh|abv|acm|acq|acw|acx|acy|adf|ads|aeb|aec|afb|ajp|apc|apd|arb|arq|ars|ary|arz|auz|avl|ayh|ayl|ayn|ayp|bbz|pga|he|iw|ps|pbt|pbu|pst|prp|prd|ug|ur|ydd|yds|yih|ji|yi|hbo|men|xmn|fa|jpr|peo|pes|prs|dv|sam|ckb)$/;

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
} as const;

const formatCode = (code: string): string => {
  if (!code.includes('-')) {
    return code;
  }
  try {
    return Intl.getCanonicalLocales(code).join();
  } catch {
    return code;
  }
};

// Same order i18next resolves with `fallbackLng: {no: ['nb', 'en'], default: ['en']}`:
// requested code, script variant, base language, then fallbacks.
function resolveHierarchy(locale: string): string[] {
  const codes: string[] = [];
  const add = (code: string) => {
    if (code && !codes.includes(code)) {
      codes.push(code);
    }
  };

  add(formatCode(locale));

  const cleaned = locale.replace('_', '-');
  if (cleaned.includes('-')) {
    const script = cleaned.slice(0, cleaned.lastIndexOf('-'));
    if (script.includes('-') && !script.toLowerCase().endsWith('-x')) {
      add(formatCode(script));
    }
    add(cleaned.slice(0, cleaned.indexOf('-')));
  }

  for (const fallback of codes.includes('no') ? ['nb', 'en'] : ['en']) {
    add(fallback);
  }
  return codes;
}

const isRtl = (code: string) =>
  RTL_LANGUAGE.test(code.replace('_', '-').replace(/-.*/, '')) ||
  code.toLowerCase().indexOf('-arab') > 1;

const escape = (value: string) =>
  value.replace(/[&<>"'/]/g, (char) => ENTITIES[char as keyof typeof ENTITIES]);

function interpolate(text: string, values: InterpolationValues = {}): string {
  return text.replace(/\{(.+?)\}/g, (placeholder, name: string) => {
    const key = name.trim();
    if (!Object.hasOwn(values, key)) {
      return placeholder;
    }
    const value = values[key];
    return value === undefined || value === null ? '' : escape(String(value));
  });
}

export function createLightI18n(registry: Record<string, TranslationResource>): LightI18nFactory {
  const bundles = new Map(Object.entries(registry));

  return (locale = 'en'): LightI18n => {
    const chain = resolveHierarchy(locale).flatMap((code) => {
      const bundle = bundles.get(code);
      return bundle ? [{ code, bundle }] : [];
    });
    const resolved =
      chain.find(({ bundle }) => Object.keys(bundle).length > 0)?.code ?? formatCode(locale);
    const direction = isRtl(resolved) ? 'rtl' : 'ltr';

    return {
      t: (key, values) => {
        for (const { bundle } of chain) {
          const translation = bundle[key];
          if (typeof translation === 'string' && translation !== '') {
            return interpolate(translation, values);
          }
        }
        return interpolate(key, values);
      },
      dir: () => direction,
    };
  };
}

/** Light counterpart of `i18nFromGlob` for the per-namespace registry entries. */
export function lightI18nFromGlob(
  globModules: Record<string, TranslationResource>,
): LightI18nFactory {
  return createLightI18n(registryFromGlob(globModules));
}
