/* eslint no-invalid-this:0 */
const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const models = require('../../../../core/server/models');

describe('Unit: models/newsletter', function () {
    before(function () {
        models.init();
    });

    after(function () {
        sinon.restore();
    });

    describe('validation', function () {
        describe('blank', function () {
            it('throws validation error for mandatory fields', function () {
                return models.Newsletter.add({})
                    .then(function () {
                        throw new Error('expected ValidationError');
                    })
                    .catch(function (err) {
                        assert.equal(err.length, 2);
                        assert.equal((err[0] instanceof errors.ValidationError), true);
                        assert.equal((err[1] instanceof errors.ValidationError), true);
                        assert.match(err[0].message, /newsletters\.name/);
                        assert.match(err[1].message, /newsletters\.slug/);
                    });
            });
        });
    });
});
