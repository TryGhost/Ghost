// i18next-free search entry — import as '@tryghost/i18n/light/search'.
// Vite requires the glob to be a string literal; all wiring is in ../light-factory.ts.
import { lightI18nFromGlob } from '../light-factory.ts';

export default lightI18nFromGlob(
  import.meta.glob('../../locales/*/search.json', { eager: true, import: 'default' }),
);
