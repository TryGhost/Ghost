// Types for the per-namespace subpath exports, e.g. '@tryghost/i18n/registry/portal'.
import type {I18nFactory, LocaleDataEntry} from './index';

declare const i18n: I18nFactory;

export default i18n;
export declare const LOCALE_DATA: LocaleDataEntry[];
export declare const SUPPORTED_LOCALES: string[];
export declare function generateResources(
    locales: string[],
    ns: string
): Record<string, Record<string, Record<string, string>>>;
export type {LocaleDataEntry};
