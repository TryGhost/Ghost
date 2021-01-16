// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const {EventProcessingResult} = require('..');

describe('EventProcessingResult', function () {
    it('has expected initial state', function () {
        const result = new EventProcessingResult();

        result.delivered.should.equal(0);
        result.opened.should.equal(0);
        result.temporaryFailed.should.equal(0);
        result.permanentFailed.should.equal(0);
        result.unsubscribed.should.equal(0);
        result.complained.should.equal(0);
        result.unhandled.should.equal(0);
        result.unprocessable.should.equal(0);

        result.processingFailures.should.equal(0);

        result.emailIds.should.deepEqual([]);
        result.memberIds.should.deepEqual([]);
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

        result.delivered.should.equal(1);
        result.opened.should.equal(2);
        result.temporaryFailed.should.equal(3);
        result.permanentFailed.should.equal(4);
        result.unsubscribed.should.equal(5);
        result.complained.should.equal(6);
        result.unhandled.should.equal(7);
        result.unprocessable.should.equal(8);

        result.processingFailures.should.equal(9);

        result.emailIds.should.deepEqual([1,2,3]);
        result.memberIds.should.deepEqual([4,5]);
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

        result.totalEvents.should.equal(36);
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

            result.delivered.should.equal(3);
            result.opened.should.equal(6);
            result.temporaryFailed.should.equal(9);
            result.permanentFailed.should.equal(12);
            result.unsubscribed.should.equal(15);
            result.complained.should.equal(18);
            result.unhandled.should.equal(21);
            result.unprocessable.should.equal(24);
            result.processingFailures.should.equal(27);

            result.emailIds.should.deepEqual([1,2,3,4,5,6]);
            result.memberIds.should.deepEqual([4,5,6,7]);
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

            result.emailIds.should.deepEqual([1,2,3,4]);
            result.memberIds.should.deepEqual([9,8,7,6]);
        });
    });
});
