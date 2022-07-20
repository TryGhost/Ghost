const should = require('should');
const sinon = require('sinon');

const I18n = require('../../../../../core/frontend/services/theme-engine/i18n/i18n');

const logging = {
    warn: sinon.stub(),
    error: sinon.stub()
};

describe('I18n Class Behaviour', function () {
    it('defaults to en', function () {
        const i18n = new I18n({logging});
        i18n.locale().should.eql('en');
    });

    it('can have a different locale set', function () {
        const i18n = new I18n({locale: 'fr', logging});
        i18n.locale().should.eql('fr');
    });

    describe('file loading behaviour', function () {
        it('will fallback to en file correctly without changing locale', function () {
            const i18n = new I18n({locale: 'fr', logging});

            let fileSpy = sinon.spy(i18n, '_readTranslationsFile');

            i18n.locale().should.eql('fr');
            i18n.init();

            i18n.locale().should.eql('fr');
            fileSpy.calledTwice.should.be.true();
            fileSpy.secondCall.args[0].should.eql('en');
        });
    });

    describe('translation key dot notation (default behaviour)', function () {
        const fakeStrings = {
            test: {string: {path: 'I am correct'}}
        };
        let i18n;

        beforeEach(function initBasicI18n() {
            i18n = new I18n({logging});
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
            i18n.t('unknown.string').should.eql('An error occurred');
        });

        it('errors for invalid strings', function () {
            should(function () {
                i18n.t('unknown string');
            }).throw('i18n.t() called with an invalid key: unknown string');
        });
    });

    describe('translation key fulltext notation (theme behaviour)', function () {
        const fakeStrings = {'Full text': 'I am correct'};
        let i18n;

        beforeEach(function initFulltextI18n() {
            i18n = new I18n({stringMode: 'fulltext', logging});
            sinon.stub(i18n, '_loadStrings').returns(fakeStrings);
            i18n.init();
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
