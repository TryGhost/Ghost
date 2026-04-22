const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const models = require('../../../../core/server/models');
const {OUTBOX_STATUSES} = require('../../../../core/server/models/outbox');

describe('Unit: models/outbox', function () {
    before(function () {
        models.init();
    });

    describe('OUTBOX_STATUSES constant', function () {
        it('exports the expected status values', function () {
            assert.equal(OUTBOX_STATUSES.PENDING, 'pending');
            assert.equal(OUTBOX_STATUSES.PROCESSING, 'processing');
            assert.equal(OUTBOX_STATUSES.FAILED, 'failed');
            assert.equal(OUTBOX_STATUSES.COMPLETED, 'completed');
        });
    });

    describe('defaults', function () {
        it('sets default status to pending', function () {
            const model = new models.Outbox();
            const defaults = model.defaults();

            assert.equal(defaults.status, OUTBOX_STATUSES.PENDING);
        });

        it('sets default retry_count to 0', function () {
            const model = new models.Outbox();
            const defaults = model.defaults();

            assert.equal(defaults.retry_count, 0);
        });

        it('returns both default values', function () {
            const model = new models.Outbox();
            const defaults = model.defaults();

            assert.ok(defaults);
            assert.equal(Object.keys(defaults).length, 2);
            assert.equal(defaults.status, OUTBOX_STATUSES.PENDING);
            assert.equal(defaults.retry_count, 0);
        });
    });

    describe('validation', function () {
        it('rejects invalid status values', function () {
            return models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: '{}',
                status: 'not-a-real-status'
            })
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    assert(Array.isArray(err));
                    assert.equal(err.length, 1);
                    assert.equal((err[0] instanceof errors.ValidationError), true);
                    assert.match(err[0].context, /outbox\.status/);
                });
        });
    });
});
