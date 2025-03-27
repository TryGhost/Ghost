const should = require('should');
const sinon = require('sinon');

const I18n = require('../../../../../core/frontend/services/theme-engine/i18n/I18n');

const logging = require('@tryghost/logging');

describe('I18n Class behavior', function () {
    it('defaults to en', function () {
        const i18n = new I18n();
        i18n.locale().should.eql('en');
    });

    it('can have a different locale set', function () {
        const i18n = new I18n({locale: 'fr'});
        i18n.locale().should.eql('fr');
    });

    describe('file loading behavior', function () {
        it('will fallback to en file correctly without changing locale', function () {
            const i18n = new I18n({locale: 'fr'});

            let fileSpy = sinon.spy(i18n, '_readTranslationsFile');

            i18n.locale().should.eql('fr');
            i18n.init();

            i18n.locale().should.eql('fr');
            fileSpy.calledTwice.should.be.true();
            fileSpy.secondCall.args[0].should.eql('en');
        });
    });

    describe('translation key dot notation (default behavior)', function () {
        const fakeStrings = {
            test: {string: {path: 'I am correct'}}
        };
        let i18n;

        beforeEach(function initBasicI18n() {
            i18n = new I18n();
            sinon.stub(i18n, '_loadStrings').returns(fakeStrings);
            i18n.init();
        });

        it('correctly loads strings', function () {
            i18n._strings.should.eql(fakeStrings);
        });

        it('correctly uses dot notation', function () {
            i18n.t('test.string.path').should.eql('I am correct');
        });

        it('uses key fallback correctly', function () {
            const loggingStub = sinon.stub(logging, 'error');
            i18n.t('unknown.string').should.eql('An error occurred');
            sinon.assert.calledOnce(loggingStub);
        });

        it('errors for invalid strings', function () {
            should(function () {
                i18n.t('unknown string');
            }).throw('i18n.t() called with an invalid key: unknown string');
        });
    });

    describe('translation key fulltext notation (theme behavior)', function () {
        const fakeStrings = {'Full text': 'I am correct'};
        let i18n;

        beforeEach(function initFulltextI18n() {
            i18n = new I18n({stringMode: 'fulltext'});
            sinon.stub(i18n, '_loadStrings').returns(fakeStrings);
            i18n.init();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('correctly loads strings', function () {
            i18n._strings.should.eql(fakeStrings);
        });

        it('correctly uses fulltext with bracket notation', function () {
            i18n.t('Full text').should.eql('I am correct');
        });

        it('uses key fallback correctly', function () {
            i18n.t('unknown string').should.eql('unknown string');
        });
    });
});
