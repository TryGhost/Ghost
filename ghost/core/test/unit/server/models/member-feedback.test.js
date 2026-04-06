const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const models = require('../../../../core/server/models');

describe('Unit: models/MemberFeedback', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('validation', function () {
        it('throws if member_id is missing', function () {
            return models.MemberFeedback.add({score: 1, post_id: 'post'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    assert.equal(err.length, 1);
                    assert.equal((err[0] instanceof errors.ValidationError), true);
                    assert.match(err[0].context, /members_feedback\.member_id/);
                });
        });

        it('throws if post_id is missing', function () {
            return models.MemberFeedback.add({score: 1, member_id: '123'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    assert.equal(err.length, 1);
                    assert.equal((err[0] instanceof errors.ValidationError), true);
                    assert.match(err[0].context, /members_feedback\.post_id/);
                });
        });
    });

    it('Delete is disabled', function () {
        return models.MemberFeedback.destroy({id: 'any'})
            .then(function () {
                throw new Error('expected IncorrectUsageError');
            })
            .catch(function (err) {
                assert.equal((err instanceof errors.IncorrectUsageError), true);
            });
    });

    it('Has post and member relations', function () {
        const model = models.MemberFeedback.forge({id: 'any'});
        model.post();
        model.member();
    });
});
