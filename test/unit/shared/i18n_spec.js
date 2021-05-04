const should = require('should');

const I18n = require('../../../core/shared/i18n').I18n;

describe('I18n Class Behaviour', function () {
    it('defaults to en', function () {
        const i18n = new I18n();
        i18n.locale().should.eql('en');
    });
});
