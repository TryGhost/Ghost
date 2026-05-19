const assert = require('node:assert/strict');
const SchedulingBase = require('../../../../../core/server/adapters/scheduling/scheduling-base');

describe('SchedulingBase', function () {
    it('declares schedule, unschedule and run as required functions', function () {
        const base = new SchedulingBase();
        assert.deepEqual(base.requiredFns, ['schedule', 'unschedule', 'run']);
    });

    describe('register + rescheduleAll', function () {
        it('calls rescheduleAll on every registered rescheduler', async function () {
            const base = new SchedulingBase();
            const calls = [];

            base.register({rescheduleAll: async opts => calls.push(['a', opts])});
            base.register({rescheduleAll: async opts => calls.push(['b', opts])});
            base.register({rescheduleAll: async opts => calls.push(['c', opts])});

            await base.rescheduleAll({previousKey: {id: 'k', secret: 's'}});

            assert.equal(calls.length, 3);
            assert.deepEqual(calls.map(c => c[0]), ['a', 'b', 'c']);
            for (const [, opts] of calls) {
                assert.deepEqual(opts, {previousKey: {id: 'k', secret: 's'}});
            }
        });

        it('isolates failures: one rejecting does not prevent the others', async function () {
            const base = new SchedulingBase();
            const calls = [];

            base.register({rescheduleAll: async () => {
                throw new Error('a failed');
            }});
            base.register({rescheduleAll: async () => calls.push('b')});
            base.register({rescheduleAll: async () => calls.push('c')});

            const results = await base.rescheduleAll({});

            assert.equal(results.length, 3);
            assert.equal(results[0].status, 'rejected');
            assert.equal(results[1].status, 'fulfilled');
            assert.equal(results[2].status, 'fulfilled');
            assert.deepEqual(calls, ['b', 'c']);
        });

        it('is a no-op when nothing has registered', async function () {
            const base = new SchedulingBase();
            const results = await base.rescheduleAll();
            assert.deepEqual(results, []);
        });

        it('dedupes when the same rescheduler registers twice', async function () {
            const base = new SchedulingBase();
            let invocations = 0;
            const rescheduler = {rescheduleAll: async () => {
                invocations += 1;
            }};

            base.register(rescheduler);
            base.register(rescheduler);

            await base.rescheduleAll();

            assert.equal(invocations, 1);
        });
    });
});
