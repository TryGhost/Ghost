const assert = require('assert');

const i18n = require('../');

describe('Can translate', function () {
    describe('Dutch', function () {
        let t;

        before(function () {
            t = i18n('nl').t;
        });

        it('can translate Dutch', function () {
            assert.equal(t('Hello'), 'Hallo');
        });
    });

    describe('English', function () {
        let t;

        before(function () {
            t = i18n('en').t;
        });

        it('can translate English', function () {
            assert.equal(t('Hello'), 'Hello');
        });
    });
});
