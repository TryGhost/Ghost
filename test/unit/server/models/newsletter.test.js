/* eslint no-invalid-this:0 */
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const should = require('should');
const models = require('../../../../core/server/models');

describe('Unit: models/newsletter', function () {
    const mockDb = require('mock-knex');

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
                        err.length.should.eql(2);
                        (err[0] instanceof errors.ValidationError).should.eql(true);
                        (err[1] instanceof errors.ValidationError).should.eql(true);
                        err[0].message.should.match(/newsletters\.name/);
                        err[1].message.should.match(/newsletters\.slug/);
                    });
            });
        });
    });
});
