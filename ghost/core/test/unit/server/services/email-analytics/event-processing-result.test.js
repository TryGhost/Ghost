const assert = require('assert/strict');

const EventProcessingResult = require('../../../../../core/server/services/email-analytics/EventProcessingResult');

describe('EventProcessingResult', function () {
    it('has expected initial state', function () {
        const result = new EventProcessingResult();

        assert.equal(result.delivered, 0);
        assert.equal(result.opened, 0);
        assert.equal(result.temporaryFailed, 0);
        assert.equal(result.permanentFailed, 0);
        assert.equal(result.unsubscribed, 0);
        assert.equal(result.complained, 0);
        assert.equal(result.unhandled, 0);
        assert.equal(result.unprocessable, 0);

        assert.equal(result.processingFailures, 0);

        assert.deepEqual(result.emailIds, []);
        assert.deepEqual(result.memberIds, []);
    });

    it('has expected populated initial state', function () {
        const result = new EventProcessingResult({
            delivered: 1,
            opened: 2,
            temporaryFailed: 3,
            permanentFailed: 4,
            unsubscribed: 5,
            complained: 6,
            unhandled: 7,
            unprocessable: 8,
            processingFailures: 9,
            emailIds: [1,2,3],
            memberIds: [4,5]
        });

        assert.equal(result.delivered, 1);
        assert.equal(result.opened, 2);
        assert.equal(result.temporaryFailed, 3);
        assert.equal(result.permanentFailed, 4);
        assert.equal(result.unsubscribed, 5);
        assert.equal(result.complained, 6);
        assert.equal(result.unhandled, 7);
        assert.equal(result.unprocessable, 8);

        assert.equal(result.processingFailures, 9);

        assert.deepEqual(result.emailIds, [1,2,3]);
        assert.deepEqual(result.memberIds, [4,5]);
    });

    it('has correct totalEvents value', function () {
        const result = new EventProcessingResult({
            delivered: 1,
            opened: 2,
            temporaryFailed: 3,
            permanentFailed: 4,
            unsubscribed: 5,
            complained: 6,
            unhandled: 7,
            unprocessable: 8,
            processingFailures: 9, // not counted
            emailIds: [1,2,3],
            memberIds: [4,5]
        });

        assert.equal(result.totalEvents, 36);
    });

    describe('merge()', function () {
        it('adds counts and merges id arrays', function () {
            const result = new EventProcessingResult({
                delivered: 1,
                opened: 2,
                temporaryFailed: 3,
                permanentFailed: 4,
                unsubscribed: 5,
                complained: 6,
                unhandled: 7,
                unprocessable: 8,
                processingFailures: 9, // not counted
                emailIds: [1,2,3],
                memberIds: [4,5]
            });

            result.merge({
                delivered: 2,
                opened: 4,
                temporaryFailed: 6,
                permanentFailed: 8,
                unsubscribed: 10,
                complained: 12,
                unhandled: 14,
                unprocessable: 16,
                processingFailures: 18, // not counted
                emailIds: [4,5,6],
                memberIds: [6,7]
            });

            assert.equal(result.delivered, 3);
            assert.equal(result.opened, 6);
            assert.equal(result.temporaryFailed, 9);
            assert.equal(result.permanentFailed, 12);
            assert.equal(result.unsubscribed, 15);
            assert.equal(result.complained, 18);
            assert.equal(result.unhandled, 21);
            assert.equal(result.unprocessable, 24);
            assert.equal(result.processingFailures, 27);

            assert.deepEqual(result.emailIds, [1,2,3,4,5,6]);
            assert.deepEqual(result.memberIds, [4,5,6,7]);
        });

        it('deduplicates id arrays', function () {
            const result = new EventProcessingResult({
                emailIds: [1,2,3],
                memberIds: [9,8,7]
            });

            result.merge({
                emailIds: [1,4,2,3,1],
                memberIds: [8,7,8,6]
            });

            assert.deepEqual(result.emailIds, [1,2,3,4]);
            assert.deepEqual(result.memberIds, [9,8,7,6]);
        });
    });
});
