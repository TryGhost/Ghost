import assert from 'node:assert/strict';
import sinon from 'sinon';
import InMemoryJobQueue from '../../../../../core/server/adapters/jobqueue/InMemoryJobQueue';

describe('InMemoryJobQueue', function () {
    let logging: {info: sinon.SinonStub; warn: sinon.SinonStub; error: sinon.SinonStub};

    beforeEach(function () {
        logging = {info: sinon.stub(), warn: sinon.stub(), error: sinon.stub()};
    });

    function createQueue() {
        return new InMemoryJobQueue({logging});
    }

    describe('handle + dispatch', function () {
        it('runs the registered handler with the dispatched job instance', async function () {
            const jobs = createQueue();
            class SendEmail {
                static type = 'send-email';
                readonly data: {emailId: string};
                constructor(data: {emailId: string}) {
                    this.data = data;
                }
            }

            const handler = sinon.stub().resolves();
            jobs.handle(SendEmail, handler);

            const job = new SendEmail({emailId: 'abc'});
            await jobs.dispatch(job);
            await jobs.allSettled();

            assert.equal(handler.callCount, 1);
            assert.equal(handler.firstCall.args[0], job);
            assert.deepEqual(handler.firstCall.args[0].data, {emailId: 'abc'});
        });

        it('starts the handler eagerly during dispatch', async function () {
            const jobs = createQueue();
            class Ping {
                static type = 'ping';
            }
            let ran = false;
            jobs.handle(Ping, async () => {
                ran = true;
            });

            const dispatched = jobs.dispatch(new Ping());
            // fastq invokes the worker synchronously when a slot is free, so
            // the handler has already run up to its first await.
            assert.equal(ran, true, 'fastq starts the handler synchronously on push');

            await dispatched;
            await jobs.allSettled();
        });

        it('throws when registering a job class without a static type', function () {
            const jobs = createQueue();
            class Anonymous {}

            assert.throws(
                () => jobs.handle(Anonymous as never, sinon.stub()),
                /static type/i
            );
        });

        it('throws when a second handler is registered for the same job type', function () {
            const jobs = createQueue();
            class CleanTokens {
                static type = 'clean-tokens';
            }
            class CleanTokensCopy {
                static type = 'clean-tokens';
            }
            jobs.handle(CleanTokens, sinon.stub());

            assert.throws(() => jobs.handle(CleanTokensCopy, sinon.stub()), /already/i);
        });

        it('reset() drops registrations so a re-boot can rebind handlers', async function () {
            const jobs = createQueue();
            class CleanTokens {
                static type = 'clean-tokens';
            }
            const stale = sinon.stub().resolves();
            const fresh = sinon.stub().resolves();

            jobs.handle(CleanTokens, stale);
            jobs.reset();
            jobs.handle(CleanTokens, fresh);

            await jobs.dispatch(new CleanTokens());
            await jobs.allSettled();

            sinon.assert.notCalled(stale);
            sinon.assert.calledOnce(fresh);
        });

        it('throws when dispatching a job with no registered handler', async function () {
            const jobs = createQueue();
            class Orphan {
                static type = 'orphan';
            }

            await assert.rejects(() => jobs.dispatch(new Orphan()), /No handler registered/);
        });

        it('logs the error thrown by a handler and keeps draining other jobs', async function () {
            const jobs = createQueue();
            class Boom {
                static type = 'boom';
            }
            class Ok {
                static type = 'ok';
            }
            const okHandler = sinon.stub().resolves();
            jobs.handle(Boom, sinon.stub().rejects(new Error('kaboom')));
            jobs.handle(Ok, okHandler);

            await jobs.dispatch(new Boom());
            await jobs.dispatch(new Ok());
            await jobs.allSettled();

            assert.equal(logging.error.callCount, 1);
            assert.equal(okHandler.callCount, 1);
        });

        it('allSettled resolves immediately when the queue is empty', async function () {
            const jobs = createQueue();
            await jobs.allSettled();
        });

        it('routes handler errors through a custom errorHandler when provided', async function () {
            const errorHandler = sinon.stub();
            const jobs = new InMemoryJobQueue({logging, errorHandler});
            class Boom {
                static type = 'boom';
            }
            const cause = new Error('kaboom');
            jobs.handle(Boom, sinon.stub().rejects(cause));

            await jobs.dispatch(new Boom());
            await jobs.allSettled();

            assert.equal(errorHandler.callCount, 1);
            assert.ok(errorHandler.firstCall.args[0] instanceof Error);
        });
    });

    describe('per-type concurrency caps', function () {
        function deferred() {
            let resolve!: () => void;
            const promise = new Promise<void>((res) => {
                resolve = res;
            });
            return {promise, resolve};
        }

        it('holds a capped type at its limit while other types keep running', async function () {
            const jobs = new InMemoryJobQueue({logging, concurrency: 3});
            class Webmention {
                static type = 'webmention';
            }
            class SendEmail {
                static type = 'send-email';
            }

            const gate = deferred();
            const started: string[] = [];
            jobs.handle(Webmention, async () => {
                started.push('webmention');
                await gate.promise;
            }, {concurrency: 1});
            jobs.handle(SendEmail, async () => {
                started.push('email');
            });

            await jobs.dispatch(new Webmention());
            await jobs.dispatch(new Webmention());
            await jobs.dispatch(new SendEmail());
            await new Promise(setImmediate);

            assert.deepEqual(started, ['webmention', 'email'], 'second webmention must wait, email must not');

            gate.resolve();
            await jobs.allSettled();
            assert.equal(started.filter(s => s === 'webmention').length, 2, 'capped job still runs to completion');
        });

        it('lets an uncapped type use every global slot', async function () {
            const jobs = new InMemoryJobQueue({logging, concurrency: 2});
            class Task {
                static type = 'task';
            }

            const gate = deferred();
            let inFlight = 0;
            let maxInFlight = 0;
            jobs.handle(Task, async () => {
                inFlight += 1;
                maxInFlight = Math.max(maxInFlight, inFlight);
                await gate.promise;
                inFlight -= 1;
            });

            await jobs.dispatch(new Task());
            await jobs.dispatch(new Task());
            await jobs.dispatch(new Task());
            await new Promise(setImmediate);

            assert.equal(maxInFlight, 2, 'bounded by the global limit only');
            gate.resolve();
            await jobs.allSettled();
        });

        it('runs a capped type in its own pool alongside the default queue', async function () {
            // Default queue fully occupied; the capped type still runs, because
            // its pool is independent rather than a share of the global limit.
            const jobs = new InMemoryJobQueue({logging, concurrency: 1});
            class SlowEmail {
                static type = 'slow-email';
            }
            class Webmention {
                static type = 'webmention';
            }

            const gate = deferred();
            const started: string[] = [];
            jobs.handle(SlowEmail, async () => {
                started.push('email');
                await gate.promise;
            });
            jobs.handle(Webmention, async () => {
                started.push('webmention');
            }, {concurrency: 1});

            await jobs.dispatch(new SlowEmail());
            await jobs.dispatch(new Webmention());
            await new Promise(setImmediate);

            assert.deepEqual(started, ['email', 'webmention'], 'capped type is not blocked by a saturated default queue');

            gate.resolve();
            await jobs.allSettled();
        });
    });

    describe('scheduleRecurring', function () {
        let clock: sinon.SinonFakeTimers;

        beforeEach(function () {
            clock = sinon.useFakeTimers({
                now: new Date(2026, 0, 1, 2, 0, 0).getTime(),
                toFake: ['setTimeout', 'clearTimeout', 'Date']
            });
        });

        afterEach(function () {
            clock.restore();
        });

        class CleanTokens {
            static type = 'clean-tokens';
        }

        it('does not fire the handler before the scheduled time', async function () {
            const jobs = createQueue();
            const handler = sinon.stub().resolves();
            jobs.handle(CleanTokens, handler);

            jobs.scheduleRecurring(new CleanTokens(), {cron: '0 0 3 * * *'});

            await clock.tickAsync(59 * 60 * 1000); // to 02:59, before 03:00
            assert.equal(handler.callCount, 0);
        });

        it('fires the handler when the cron time arrives', async function () {
            const jobs = createQueue();
            const handler = sinon.stub().resolves();
            jobs.handle(CleanTokens, handler);

            jobs.scheduleRecurring(new CleanTokens(), {cron: '0 0 3 * * *'});

            await clock.tickAsync(60 * 60 * 1000); // advance to 03:00
            await jobs.allSettled();
            assert.equal(handler.callCount, 1);
        });

        it('re-arms and fires again on the next period', async function () {
            const jobs = createQueue();
            const handler = sinon.stub().resolves();
            jobs.handle(CleanTokens, handler);

            jobs.scheduleRecurring(new CleanTokens(), {cron: '0 0 3 * * *'});

            await clock.tickAsync(25 * 60 * 60 * 1000); // 25h: covers two 03:00s
            await jobs.allSettled();
            assert.equal(handler.callCount, 2);
        });

        it('throws immediately on an invalid cron expression', function () {
            const jobs = createQueue();
            jobs.handle(CleanTokens, sinon.stub());

            assert.throws(() => jobs.scheduleRecurring(new CleanTokens(), {cron: 'not a cron'}), /cron/);
            assert.throws(() => jobs.scheduleRecurring(new CleanTokens(), {cron: '99 99 99 * * *'}), /Invalid value/);
        });

        it('bounds the shutdown drain when a handler never settles', async function () {
            const jobs = createQueue();
            class Stuck {
                static type = 'stuck';
            }
            jobs.handle(Stuck, () => new Promise(() => {}));

            await jobs.dispatch(new Stuck());
            await clock.tickAsync(1); // let the handler start

            const shutdown = jobs.shutdown();
            await clock.tickAsync(31 * 1000);
            await shutdown;

            assert.equal(logging.warn.callCount, 1);
            assert.match(logging.warn.firstCall.args[0], /timed out/);
        });

        it('stops firing after shutdown', async function () {
            const jobs = createQueue();
            const handler = sinon.stub().resolves();
            jobs.handle(CleanTokens, handler);

            jobs.scheduleRecurring(new CleanTokens(), {cron: '0 0 3 * * *'});
            await jobs.shutdown();

            await clock.tickAsync(25 * 60 * 60 * 1000);
            assert.equal(handler.callCount, 0);
        });
    });
});
