// Per-namespace browser entry — import as '@tryghost/i18n/registry/search'.
// Only the literal glob pattern + namespace name live here (Vite requires the
// glob to be a string literal); all wiring is in ../esm-factory.mjs.
import {i18nFromGlob} from '../esm-factory.mjs';

const i18n = i18nFromGlob(import.meta.glob('../../locales/*/search.json', {eager: true, import: 'default'}), 'search');

export default i18n;
export const {LOCALE_DATA, SUPPORTED_LOCALES, generateResources} = i18n;
