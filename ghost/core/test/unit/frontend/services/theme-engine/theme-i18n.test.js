const should = require('should');

const ThemeI18n = require('../../../../../core/frontend/services/theme-engine/i18n').ThemeI18n;

describe('ThemeI18n Class behavior', function () {
    it('defaults to en', function () {
        const i18n = new ThemeI18n();
        i18n.locale().should.eql('en');
    });
});
