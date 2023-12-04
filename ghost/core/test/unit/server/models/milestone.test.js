const models = require('../../../../core/server/models');
const assert = require('assert/strict');
const errors = require('@tryghost/errors');

describe('Unit: models/milestone', function () {
    before(function () {
        models.init();
    });

    describe('validation', function () {
        describe('blank', function () {
            it('throws validation error for mandatory fields', function () {
                return models.Milestone.add({})
                    .then(function () {
                        throw new Error('expected ValidationError');
                    })
                    .catch(function (err) {
                        assert.equal(err.length, 2);
                        assert.equal((err[0] instanceof errors.ValidationError), true);
                        assert.equal((err[1] instanceof errors.ValidationError), true);
                        assert.match(err[0].message,/milestones\.type/);
                        assert.match(err[1].message,/milestones\.value/);
                    });
            });
        });
    });
});
