const assert = require('node:assert/strict');
const should = require('should');
const sinon = require('sinon');

const I18n = require('../../../../../core/frontend/services/theme-engine/i18n/i18n');

const logging = require('@tryghost/logging');

describe('I18n Class behavior', function () {
    it('defaults to en', function () {
        const i18n = new I18n();
        assert.equal(i18n.locale(), 'en');
    });

    it('can have a different locale set', function () {
        const i18n = new I18n({locale: 'fr'});
        assert.equal(i18n.locale(), 'fr');
    });

    describe('file loading behavior', function () {
        it('will fallback to en file correctly without changing locale', function () {
            const i18n = new I18n({locale: 'fr'});

            let fileSpy = sinon.spy(i18n, '_readTranslationsFile');

            assert.equal(i18n.locale(), 'fr');
            i18n.init();

            assert.equal(i18n.locale(), 'fr');
            assert.equal(fileSpy.calledTwice, true);
            assert.equal(fileSpy.secondCall.args[0], 'en');
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
            assert.equal(i18n._strings, fakeStrings);
        });

        it('correctly uses dot notation', function () {
            assert.equal(i18n.t('test.string.path'), 'I am correct');
        });

        it('uses key fallback correctly', function () {
            const loggingStub = sinon.stub(logging, 'error');
            assert.equal(i18n.t('unknown.string'), 'An error occurred');
            sinon.assert.calledOnce(loggingStub);
        });

        it('errors for invalid strings', function () {
            assert.throws(
                () => i18n.t('unknown string'),
                {message: 'i18n.t() called with an invalid key: unknown string'}
            );
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
            assert.equal(i18n._strings, fakeStrings);
        });

        it('correctly uses fulltext with bracket notation', function () {
            assert.equal(i18n.t('Full text'), 'I am correct');
        });

        it('uses key fallback correctly', function () {
            assert.equal(i18n.t('unknown string'), 'unknown string');
        });
    });
});
