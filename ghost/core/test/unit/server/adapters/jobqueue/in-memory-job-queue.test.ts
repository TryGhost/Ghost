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
});
