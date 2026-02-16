const assert = require('node:assert/strict');
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
});
