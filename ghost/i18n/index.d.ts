import type {i18n as I18nextInstance} from 'i18next';

export interface LocaleDataEntry {
    code: string;
    name: string;
    [key: string]: unknown;
}

export type Namespace = 'ghost' | 'portal' | 'signup-form' | 'comments' | 'search' | 'theme';

export interface I18nFactory {
    (locale?: string, ns?: Namespace | string, options?: Record<string, unknown>): I18nextInstance;
    LOCALE_DATA: LocaleDataEntry[];
    SUPPORTED_LOCALES: string[];
    generateResources(locales: string[], ns: string): Record<string, Record<string, Record<string, string>>>;
    default: I18nFactory;
}

declare const i18n: I18nFactory;

export default i18n;
export declare const LOCALE_DATA: LocaleDataEntry[];
export declare const SUPPORTED_LOCALES: string[];
export declare function generateResources(
    locales: string[],
    ns: string
): Record<string, Record<string, Record<string, string>>>;
