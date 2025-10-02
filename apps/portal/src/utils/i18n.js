import i18nLib from '@tryghost/i18n';

const i18n = i18nLib('en', 'portal');

export const t = i18n.t.bind(i18n);

export default i18n;
