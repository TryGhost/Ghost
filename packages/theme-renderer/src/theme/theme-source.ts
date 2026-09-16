/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ThemeSource — fresh code (slice 1).
 *
 * Wraps an injected map of theme files (path → content, fs-free — the test
 * harness reads Casper with node:fs, src never touches a filesystem) into:
 *
 * - the engine's TemplateResolver (virtual fs),
 * - the theme config lookup (package.json `config` block merged over the
 *   defaults from theme-engine/config/defaults.json @ 407e032dc7:
 *   `{posts_per_page: 5, card_assets: true}`, allowed keys
 *   `posts_per_page`, `image_sizes`, `card_assets` — see
 *   theme-engine/config/index.js),
 * - the root-level template inventory (ActiveTheme.hasTemplate),
 * - custom theme setting defaults (package.json `config.custom` — the value a
 *   fresh install renders with; live values are Admin-API-only),
 * - theme locale lookup for {{t}} (locales/{locale}.json).
 */
import type { TemplateResolver } from '../engine/engine.ts';
import type { I18nPort } from '../seam/types.ts';

export type ThemeFiles = Record<string, string> | Map<string, string>;

export interface ThemeSource {
  files: Map<string, string>;
  resolver: TemplateResolver;
  /** Root-level template names (no extension), e.g. ['index', 'post', ...] */
  templates: string[];
  hasTemplate(name: string): boolean;
  /** theme-engine config lookup: posts_per_page, image_sizes, card_assets */
  config(key: string): any;
  /** Defaults for the `@custom` frame from package.json config.custom */
  customDefaults: Record<string, any>;
  /** {{t}} translation over locales/{locale}.json ({var} interpolation) */
  i18n(locale?: string): I18nPort;
  packageJson: Record<string, any> | null;
}

// theme-engine/config/defaults.json @ 407e032dc7
const CONFIG_DEFAULTS: Record<string, any> = {
  posts_per_page: 5,
  card_assets: true,
};

// theme-engine/config/index.js allowedKeys
const CONFIG_ALLOWED_KEYS = ['posts_per_page', 'image_sizes', 'card_assets'];

function normalize(files: ThemeFiles): Map<string, string> {
  const map = files instanceof Map ? new Map(files) : new Map(Object.entries(files));
  // normalize leading './' or '/' so lookups are stable
  const normalized = new Map<string, string>();
  for (const [key, value] of map) {
    normalized.set(key.replace(/^\.?\//, ''), value);
  }
  return normalized;
}

function parseJson(source: string | undefined): Record<string, any> | null {
  if (source === undefined) {
    return null;
  }
  try {
    return JSON.parse(source);
  } catch {
    return null;
  }
}

function interpolate(template: string, bindings?: Record<string, any>): string {
  if (!bindings) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, function (match, name) {
    return Object.prototype.hasOwnProperty.call(bindings, name) ? String(bindings[name]) : match;
  });
}

export function createThemeSource(files: ThemeFiles): ThemeSource {
  const map = normalize(files);

  const packageJson = parseJson(map.get('package.json'));

  // theme-engine/config/index.js:create
  const themeConfig: Record<string, any> = { ...CONFIG_DEFAULTS };
  if (packageJson && Object.prototype.hasOwnProperty.call(packageJson, 'config')) {
    for (const key of CONFIG_ALLOWED_KEYS) {
      if (packageJson.config && Object.prototype.hasOwnProperty.call(packageJson.config, key)) {
        themeConfig[key] = packageJson.config[key];
      }
    }
  }

  const customDefaults: Record<string, any> = {};
  const customSchema = packageJson?.config?.custom;
  if (customSchema && typeof customSchema === 'object') {
    for (const [name, definition] of Object.entries<any>(customSchema)) {
      customDefaults[name] = definition?.default;
    }
  }

  const templates = [...map.keys()]
    .filter((path) => !path.includes('/') && path.endsWith('.hbs'))
    .map((path) => path.slice(0, -'.hbs'.length));

  return {
    files: map,
    resolver: {
      resolve: (name) => map.get(name),
      list: () => [...map.keys()],
    },
    templates,
    hasTemplate(name: string) {
      return templates.includes(name);
    },
    config(key: string) {
      return themeConfig[key];
    },
    customDefaults,
    i18n(locale = 'en') {
      const strings =
        parseJson(map.get(`locales/${locale}.json`)) ?? parseJson(map.get('locales/en.json'));
      return {
        t(key: string, bindings?: Record<string, any>) {
          if (!key) {
            return '';
          }
          const translation =
            strings && typeof strings[key] === 'string' && strings[key] ? strings[key] : key;
          return interpolate(translation, bindings);
        },
      };
    },
    packageJson,
  };
}
