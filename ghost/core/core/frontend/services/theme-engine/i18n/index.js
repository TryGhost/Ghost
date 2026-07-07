const createFacade = require('../../../../shared/container/create-facade');
const ThemeI18n = require('./theme-i18n');

module.exports = createFacade('themeI18n', () => {
    const config = require('../../../../shared/config');
    return new ThemeI18n({basePath: config.getContentPath('themes')});
});
