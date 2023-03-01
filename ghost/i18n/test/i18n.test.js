const assert = require('assert');

const i18n = require('../');

describe('i18n', function () {
    describe('Can use Portal resources', function () {
        describe('English', function () {
            let t;

            before(function () {
                t = i18n('nl', 'portal').t;
            });

            it('can translate `Name`', function () {
                assert.equal(t('Name'), 'Naam');
            });
        });
    });

    describe('Can translate', function () {
        describe('Dutch', function () {
            let t;

            before(function () {
                t = i18n('nl', 'test').t;
            });

            it('can translate Dutch', function () {
                assert.equal(t('Hello'), 'Hallo Test');
            });
        });

        describe('English', function () {
            let t;

            before(function () {
                t = i18n('en', 'test').t;
            });

            it('can translate English', function () {
                assert.equal(t('Hello'), 'Hello Test');
            });
        });
    });
});
