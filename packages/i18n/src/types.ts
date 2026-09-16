import type { i18n as I18nextInstance } from 'i18next';

export interface LocaleDataEntry {
  code: string;
  label: string;
  [key: string]: unknown;
}

export type Namespace = 'ghost' | 'portal' | 'signup-form' | 'comments' | 'search' | 'theme';

/** One namespace's translations, as loaded from a locale JSON file. */
export type TranslationResource = Record<string, unknown>;

/** i18next's `resources` shape: locale -> namespace -> translations. */
export type Resources = Record<string, Record<string, TranslationResource>>;

/** Injected into `createGenerateResources`; returns undefined for an unknown locale. */
export type ResourceLoader = (locale: string, ns: string) => TranslationResource | undefined;

export type GenerateResources = (locales: string[], ns: string) => Resources;

export type GenerateThemeResources = (lng: string, options: I18nOptions) => Resources;

export interface I18nOptions {
  themePath?: string;
  [key: string]: unknown;
}

export interface I18nFactory {
  (locale?: string, ns?: Namespace | string, options?: I18nOptions): I18nextInstance;
  LOCALE_DATA: LocaleDataEntry[];
  SUPPORTED_LOCALES: string[];
  generateResources: GenerateResources;
  /** Set by the browser registry entries to the namespace they were built for. */
  namespace?: string;
  /** Self-reference kept for bundlers that unwrap a namespace's default export. */
  default: I18nFactory;
}
