// Reading locale codes straight from the JSON keeps `pnpm translate` build-free.
import LOCALE_DATA from './src/locale-data.json' with { type: 'json' };

/**
 * @type {import('i18next-parser').UserConfig}
 */
export default {
  locales: LOCALE_DATA.map((locale) => locale.code),

  keySeparator: false,
  namespaceSeparator: false,

  defaultNamespace: process.env.NAMESPACE || 'translation',

  createOldCatalogs: false,
  indentation: 4,
  sort: true,

  failOnUpdate: process.env.CI,

  output: 'locales/$LOCALE/$NAMESPACE.json',
};
