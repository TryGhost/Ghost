export interface LocaleData {
    code: string;
    label: string;
}

export const SUPPORTED_LOCALES: string[];
export const LOCALE_DATA: LocaleData[];

declare function i18n(lng?: string, ns?: 'ghost' | 'portal' | 'test' | 'signup-form' | 'comments' | 'search'): any;
export default i18n;