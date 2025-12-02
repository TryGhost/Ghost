export interface LocaleData {
    code: string;
    label: string;
}

declare function i18n(lng?: string, ns?: 'ghost' | 'portal' | 'test' | 'signup-form' | 'comments' | 'search'): unknown;

declare namespace i18n {
    export const SUPPORTED_LOCALES: string[];
    export const LOCALE_DATA: LocaleData[];
}

export = i18n;