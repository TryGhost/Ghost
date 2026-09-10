// Node entry point for @tryghost/i18n.
import {
  createGenerateResources,
  createI18n,
  LOCALE_DATA,
  SUPPORTED_LOCALES,
} from './i18n-core.ts';
import { requireLoader } from './require-loader.ts';
import { generateThemeResources } from './theme-resources.ts';
import type { I18nFactory } from './types.ts';

const generateResources = createGenerateResources(requireLoader);

const i18n = Object.assign(createI18n({ generateResources, generateThemeResources }), {
  LOCALE_DATA,
  SUPPORTED_LOCALES,
  generateResources,
}) as I18nFactory;

// Self-reference kept for bundlers that unwrap a namespace's default export.
i18n.default = i18n;

export default i18n;
export { LOCALE_DATA, SUPPORTED_LOCALES, generateResources };
export type * from './types.ts';
