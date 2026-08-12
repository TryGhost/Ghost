import assert from 'node:assert/strict';
import sinon from 'sinon';
import type {JobEnvelope, RecurringSchedule} from '@tryghost/adapter-base-jobs';
import {Job} from '../../../../../../core/server/services/jobs/v2/job';
import {JobsService} from '../../../../../../core/server/services/jobs/v2/jobs-service';
import InMemoryJobsBackend from '../../../../../../core/server/adapters/jobs/InMemoryJobsBackend';

class TestJob extends Job {
    static type = 'test-job';

    declare value: number;

    constructor({value}: {value: number}) {
        super({value});
    }
}

describe('JobsService (v2)', function () {
    let service: JobsService;
    let backend: InMemoryJobsBackend;
    let errorReporter: sinon.SinonStub;

    beforeEach(function () {
        backend = new InMemoryJobsBackend();
        service = new JobsService();
        errorReporter = sinon.stub();
        service.init({backend, errorReporter});
    });

    afterEach(async function () {
        await service.shutdown({timeoutMs: 100});
        sinon.restore();
    });

    describe('handle', function () {
        it('requires a non-empty static type', function () {
            class NoType {}

            assert.throws(() => {
                service.handle(NoType as never, async () => {});
            }, /static `type`/);
        });

        it('requires a static deserialize', function () {
            class NoDeserialize {
                static type = 'test-no-deserialize';
            }

            assert.throws(() => {
                service.handle(NoDeserialize as never, async () => {});
            }, /static deserialize/);
        });

        it('requires the handler to be a function', function () {
            assert.throws(() => {
                service.handle(TestJob, 'not a function' as never);
            }, /must be a function/);
        });

        it('replaces the previous handler when a type is re-registered', async function () {
            const first = sinon.stub();
            const second = sinon.stub();

            service.handle(TestJob, first);
            service.handle(TestJob, second);

            assert.deepEqual(service.registeredTypes, ['test-job']);

            await service.dispatch(new TestJob({value: 1}));
            await service.allSettled();

            sinon.assert.notCalled(first);
            sinon.assert.calledOnce(second);
        });

        it('starts from a clean registration set when re-initialised', function () {
            service.handle(TestJob, async () => {});

            service.init({backend, errorReporter});

            assert.deepEqual(service.registeredTypes, []);
        });
    });

    describe('dispatch', function () {
        it('rejects a job type with no registered handler', async function () {
            await assert.rejects(async () => {
                await service.dispatch(new TestJob({value: 1}));
            }, /no handler has been registered/);
        });

        it('rejects a plain object with no job class', async function () {
            await assert.rejects(async () => {
                await service.dispatch({value: 1});
            }, /static `type`/);
        });

        it('rejects dispatch before the service is initialised', async function () {
            const uninitialised = new JobsService();
            // Registration itself works pre-init — boot may order them freely…
            uninitialised.handle(TestJob, async () => {});

            // …but dispatch needs the backend wired.
            await assert.rejects(async () => {
                await uninitialised.dispatch(new TestJob({value: 1}));
            }, /has not been initialised/);
        });

        it('resolves on acceptance, before the handler has run', async function () {
            let release!: () => void;
            const gate = new Promise<void>((resolve) => {
                release = resolve;
            });
            let handled = 0;

            service.handle(TestJob, async () => {
                await gate;
                handled += 1;
            });

            await service.dispatch(new TestJob({value: 1}));
            assert.equal(handled, 0);

            release();
            await service.allSettled();
            assert.equal(handled, 1);
        });

        it('delivers a rehydrated instance, never the dispatched object', async function () {
            const received: TestJob[] = [];
            service.handle(TestJob, (job) => {
                received.push(job);
            });

            const original = new TestJob({value: 42});
            await service.dispatch(original);

            // Mutating the dispatched object after acceptance must not leak
            // into the delivery — the payload crossed a JSON boundary.
            original.value = 99;

            await service.allSettled();

            assert.equal(received.length, 1);
            assert.ok(received[0] instanceof TestJob);
            assert.notEqual(received[0], original);
            assert.equal(received[0]!.value, 42);
        });

        it('uses a custom static deserialize when the class overrides it', async function () {
            class HookedJob extends Job {
                static type = 'test-hooked';

                declare value: number;

                constructor({value}: {value: number}) {
                    super({value});
                }

                static deserialize(data: unknown) {
                    return new HookedJob({value: (data as {value: number}).value * 2});
                }
            }

            const received: HookedJob[] = [];
            service.handle(HookedJob, (job) => {
                received.push(job);
            });

            await service.dispatch(new HookedJob({value: 21}));
            await service.allSettled();

            // 21 in the payload, doubled by deserialize — not the default
            // rehydration, which would deliver 21.
            assert.equal(received[0]!.value, 42);
        });

        it('reports handler errors and keeps both the caller and later jobs unaffected', async function () {
            const received: number[] = [];
            service.handle(TestJob, (job) => {
                if (job.value === 1) {
                    throw new Error('handler exploded');
                }
                received.push(job.value);
            });

            // Neither dispatch rejects, even though the first handler throws.
            await service.dispatch(new TestJob({value: 1}));
            await service.dispatch(new TestJob({value: 2}));
            await service.allSettled();

            assert.deepEqual(received, [2]);
            sinon.assert.calledOnce(errorReporter);
            const [error, context] = errorReporter.firstCall.args;
            assert.equal(error.message, 'handler exploded');
            assert.deepEqual(context, {jobType: 'test-job'});
        });
    });

    describe('serialisation enforcement', function () {
        beforeEach(function () {
            service.handle(TestJob, async () => {});
        });

        async function assertRejectsSerialisation(job: TestJob, pattern: RegExp) {
            await assert.rejects(async () => {
                await service.dispatch(job);
            }, (err: Error) => {
                assert.match(err.message, /not serialisable/);
                assert.match(err.message, pattern);
                return true;
            });
        }

        it('rejects payloads carrying functions', async function () {
            const job = new TestJob({value: 1});
            (job as never as {callback: () => void}).callback = () => {};

            await assertRejectsSerialisation(job, /payload\.callback is a function/);
        });

        it('rejects payloads carrying undefined', async function () {
            const job = new TestJob({value: 1});
            (job as never as {maybe: undefined}).maybe = undefined;

            await assertRejectsSerialisation(job, /payload\.maybe is undefined/);
        });

        it('rejects payloads carrying class instances, including service references', async function () {
            class SomeService {}
            const job = new TestJob({value: 1});
            (job as never as {service: SomeService}).service = new SomeService();

            await assertRejectsSerialisation(job, /payload\.service is a SomeService instance/);
        });

        it('rejects payloads carrying dates, which JSON silently flattens to strings', async function () {
            const job = new TestJob({value: 1});
            (job as never as {at: Date}).at = new Date();

            await assertRejectsSerialisation(job, /payload\.at is a Date instance/);
        });

        it('rejects payloads carrying non-finite numbers', async function () {
            const job = new TestJob({value: NaN});

            await assertRejectsSerialisation(job, /payload\.value is NaN/);
        });

        it('rejects circular payloads', async function () {
            const job = new TestJob({value: 1});
            const loop: {self?: object} = {};
            loop.self = loop;
            (job as never as {loop: object}).loop = loop;

            await assertRejectsSerialisation(job, /circular reference/);
        });

        it('accepts nested plain data', async function () {
            const job = new TestJob({value: 1});
            (job as never as {extra: object}).extra = {list: [1, 'two', null, {three: true}]};

            await service.dispatch(job);
            await service.allSettled();
        });

        it('serialises through the job\'s serialize() hook', async function () {
            class CustomSerializeJob extends Job {
                static type = 'test-custom-serialize';

                declare value: number;

                serialize() {
                    return {value: this.value, doubled: this.value * 2};
                }
            }

            const received: Record<string, unknown>[] = [];
            service.handle(CustomSerializeJob, (job) => {
                received.push({...job});
            });

            await service.dispatch(new CustomSerializeJob({value: 3}));
            await service.allSettled();

            assert.deepEqual(received, [{value: 3, doubled: 6}]);
        });
    });

    describe('adapter seam', function () {
        it('hands the backend serialised envelopes only — a swapped backend needs no call-site changes', async function () {
            const enqueued: JobEnvelope[] = [];
            const recurring: [JobEnvelope, RecurringSchedule][] = [];
            const fakeDurableBackend = {
                start() {},
                enqueue(envelope: JobEnvelope) {
                    enqueued.push(envelope);
                },
                scheduleRecurring(envelope: JobEnvelope, schedule: RecurringSchedule) {
                    recurring.push([envelope, schedule]);
                },
                async shutdown() {}
            };

            const seamService = new JobsService();
            seamService.init({backend: fakeDurableBackend as never, errorReporter});
            seamService.handle(TestJob, async () => {});

            await seamService.dispatch(new TestJob({value: 7}));
            await seamService.scheduleRecurring(new TestJob({value: 8}), {cron: '0 30 2 * * *'});

            assert.deepEqual(enqueued, [{type: 'test-job', payload: '{"value":7}'}]);
            assert.deepEqual(recurring, [[{type: 'test-job', payload: '{"value":8}'}, {cron: '0 30 2 * * *'}]]);

            // allSettled degrades gracefully on a backend without the affordance
            await seamService.allSettled();
        });
    });

    describe('scheduleRecurring', function () {
        it('rejects a job type with no registered handler', async function () {
            await assert.rejects(async () => {
                await service.scheduleRecurring(new TestJob({value: 1}), {cron: '* * * * *'});
            }, /no handler has been registered/);
        });

        it('enforces the serialisation boundary like dispatch', async function () {
            service.handle(TestJob, async () => {});
            const job = new TestJob({value: 1});
            (job as never as {callback: () => void}).callback = () => {};

            await assert.rejects(async () => {
                await service.scheduleRecurring(job, {cron: '* * * * *'});
            }, /not serialisable/);
        });
    });
});
