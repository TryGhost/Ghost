const DomainEvents = require('../');
const assert = require('assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

class TestEvent {
    /**
     * @param {string} message
     */
    constructor(message) {
        this.timestamp = new Date();
        this.data = {
            message,
        };
    }
}

const sleep = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

describe('DomainEvents', function () {
    afterEach(function () {
        sinon.restore();
        DomainEvents.ee.removeAllListeners();
        DomainEvents.resetTrackingStateForTest();
        DomainEvents.setTrackingEnabledForTest(process.env.NODE_ENV?.startsWith('test'));
    });

    it('Will call multiple subscribers with the event when it is dispatched', async function () {
        const event = new TestEvent('Hello, world!');

        let events = [];

        /**
         * @param {TestEvent} receivedEvent
         */
        function handler1(receivedEvent) {
            // Do not add assertions here, they are caught by DomainEvents
            events.push(receivedEvent);
        }

        /**
         * @param {TestEvent} receivedEvent
         */
        function handler2(receivedEvent) {
            // Do not add assertions here, they are caught by DomainEvents
            events.push(receivedEvent);
        }

        DomainEvents.subscribe(TestEvent, handler1);
        DomainEvents.subscribe(TestEvent, handler2);

        DomainEvents.dispatch(event);
        await DomainEvents.allSettled();

        assert.equal(events.length, 2);
        assert.equal(events[0], event);
        assert.equal(events[1], event);
    });

    it('Catches async errors in handlers', async function () {
        const event = new TestEvent('Hello, world!');

        const stub = sinon.stub(logging, 'error').returns();

        /**
         * @param {TestEvent} receivedEvent
         */
        async function handler1() {
            await sleep(10);
            throw new Error('Test error');
        }

        DomainEvents.subscribe(TestEvent, handler1);

        DomainEvents.dispatch(event);
        await DomainEvents.allSettled();
        assert.equal(stub.calledTwice, true);
    });

    it('works when tracking is disabled', async function () {
        let handled = false;

        DomainEvents.setTrackingEnabledForTest(false);

        DomainEvents.subscribe(TestEvent, () => {
            handled = true;
        });

        DomainEvents.dispatch(new TestEvent('No tracking'));
        // Yield once so the async-wrapped handler can run before allSettled()
        // resolves immediately with tracking disabled.
        await sleep(0);
        await DomainEvents.allSettled();

        assert.equal(handled, true);
    });

    describe('allSettled', function () {
        it('Resolves when there are no events', async function () {
            await DomainEvents.allSettled();
            assert(true);
        });

        it('Waits for all listeners', async function () {
            let counter = 0;
            DomainEvents.subscribe(TestEvent, async () => {
                await sleep(20);
                counter += 1;
            });
            DomainEvents.subscribe(TestEvent, async () => {
                await sleep(40);
                counter += 1;
            });

            DomainEvents.dispatch(new TestEvent('Hello, world!'));
            await DomainEvents.allSettled();
            assert.equal(counter, 2);
        });

        it('waits for every tracked listener before resolving', async function () {
            let resolveFirst;
            let resolveSecond;

            DomainEvents.subscribe(TestEvent, () => {
                return new Promise((resolve) => {
                    resolveFirst = resolve;
                });
            });
            DomainEvents.subscribe(TestEvent, () => {
                return new Promise((resolve) => {
                    resolveSecond = resolve;
                });
            });

            DomainEvents.dispatch(new TestEvent('Hello, world!'));

            let settled = false;
            const allSettled = DomainEvents.allSettled().then(() => {
                settled = true;
            });

            await sleep(0);
            assert.equal(settled, false);

            resolveFirst();
            await sleep(0);
            assert.equal(settled, false);

            resolveSecond();
            await allSettled;
            assert.equal(settled, true);
        });
    });
});
