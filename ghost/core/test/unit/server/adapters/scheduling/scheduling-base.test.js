const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
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

            const errorStub = sinon.stub(logging, 'error');
            try {
                const results = await base.rescheduleAll({});

                assert.equal(results.length, 3);
                assert.equal(results[0].status, 'rejected');
                assert.equal(results[1].status, 'fulfilled');
                assert.equal(results[2].status, 'fulfilled');
                assert.deepEqual(calls, ['b', 'c']);
            } finally {
                errorStub.restore();
            }
        });

        it('logs each rejection with the rescheduler class name', async function () {
            const base = new SchedulingBase();

            // Named classes so constructor.name reflects them in the log payload.
            class PostScheduling {
                async rescheduleAll() {
                    throw new Error('post failed');
                }
            }
            class AutomationsService {
                async rescheduleAll() {}
            }

            base.register(new PostScheduling());
            base.register(new AutomationsService());

            const errorStub = sinon.stub(logging, 'error');
            try {
                await base.rescheduleAll({});

                assert.equal(errorStub.callCount, 1, 'only the failing rescheduler is logged');
                const [meta, message] = errorStub.firstCall.args;
                assert.equal(meta.event.name, 'scheduler.reschedule_all.failed');
                assert.equal(meta.rescheduler, 'PostScheduling');
                assert.equal(meta.err.message, 'post failed');
                assert.equal(message, 'Rescheduler failed');
            } finally {
                errorStub.restore();
            }
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
