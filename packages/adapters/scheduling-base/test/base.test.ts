import {describe, it} from 'vitest';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging'

import {RescheduleOpts, SchedulingBase} from '../src/base.ts';

describe('SchedulingBase', function () {
    class TestScheduling extends SchedulingBase {
        async run() {}
        async schedule() {}
        async unschedule() {}
    }

    it('declares schedule, unschedule and run as required functions', function () {
        const base = new TestScheduling();
        assert.deepEqual(base.requiredFns, ['run', 'schedule', 'unschedule']);
    });

    describe('register + rescheduleAll', function () {
        it('calls rescheduleAll on every registered rescheduler', async function () {
            const base = new TestScheduling();
            const calls: [string, RescheduleOpts | undefined][] = [];

            base.register({rescheduleAll: async opts => {calls.push(['a', opts])}});
            base.register({rescheduleAll: async opts => {calls.push(['b', opts])}});
            base.register({rescheduleAll: async opts => {calls.push(['c', opts])}});

            await base.rescheduleAll({previousKey: {id: 'k', secret: 's'}});

            assert.equal(calls.length, 3);
            assert.deepEqual(calls.map(c => c[0]), ['a', 'b', 'c']);
            for (const [, opts] of calls) {
                assert.deepEqual(opts, {previousKey: {id: 'k', secret: 's'}});
            }
        });

        it('isolates failures: one rejecting does not prevent the others', async function () {
            const base = new TestScheduling();
            const calls: string[] = [];

            base.register({rescheduleAll: async () => {
                // eslint-disable-next-line ghost/ghost-custom/no-native-error
                throw new Error('a failed');
            }});
            base.register({rescheduleAll: async () => {calls.push('b')}});
            base.register({rescheduleAll: async () => {calls.push('c')}});

            const errorStub = sinon.stub(logging, 'error');
            try {
                const results = await base.rescheduleAll({});

                assert.equal(results.length, 3);
                assert.equal(results[0]!.status, 'rejected');
                assert.equal(results[1]!.status, 'fulfilled');
                assert.equal(results[2]!.status, 'fulfilled');
                assert.deepEqual(calls, ['b', 'c']);
            } finally {
                errorStub.restore();
            }
        });

        it('logs each rejection with the rescheduler class name', async function () {
            const base = new TestScheduling();

            // Named classes so constructor.name reflects them in the log payload.
            class PostScheduling {
                async rescheduleAll() {
                    // eslint-disable-next-line ghost/ghost-custom/no-native-error
                    throw new Error('post failed');
                }
            }
            class AutomationsService {
                async rescheduleAll() {}
            }

            const anonymous = new class {
                async rescheduleAll() {
                    // eslint-disable-next-line ghost/ghost-custom/no-native-error
                    throw new Error('anonymous failed');
                }
            }

            base.register(new PostScheduling());
            base.register(new AutomationsService());
            base.register(anonymous);

            const errorStub = sinon.stub(logging, 'error');
            try {
                await base.rescheduleAll({});

                assert.equal(errorStub.callCount, 2, 'only the failing reschedulers are logged');
                const [meta, message] = errorStub.firstCall.args;
                assert.equal(meta.event.name, 'scheduler.reschedule_all.failed');
                assert.equal(meta.rescheduler, 'PostScheduling');
                assert.equal(meta.err.message, 'post failed');
                assert.equal(message, 'Rescheduler failed');

                const [meta2, message2] = errorStub.secondCall.args;
                assert.equal(meta2.event.name, 'scheduler.reschedule_all.failed');
                assert.equal(meta2.rescheduler, 'unknown');
                assert.equal(meta2.err.message, 'anonymous failed');
                assert.equal(message2, 'Rescheduler failed');
            } finally {
                errorStub.restore();
            }
        });

        it('is a no-op when nothing has registered', async function () {
            const base = new TestScheduling();
            const results = await base.rescheduleAll();
            assert.deepEqual(results, []);
        });

        it('dedupes when the same rescheduler registers twice', async function () {
            const base = new TestScheduling();
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
