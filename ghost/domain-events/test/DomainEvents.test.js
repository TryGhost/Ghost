const DomainEvents = require('../');
const assert = require('assert');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

class TestEvent {
    /**
     * @param {string} message
     */
    constructor(message) {
        this.timestamp = new Date();
        this.data = {
            message
        };
    }
}

const sleep = ms => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

describe('DomainEvents', function () {
    afterEach(function () {
        sinon.restore();
        DomainEvents.ee.removeAllListeners();
    });

    it('Can await async listeners', async function () {
        const event = new TestEvent('Hello, world!');

        let count = 0;

        // Test we only run one listener in parallel
        let running = false;

        /**
         * @param {TestEvent} receivedEvent
         */
        async function handler1() {
            if (running) {
                throw new Error('Only one listener should be running at a time');
            }
            running = true;
            await sleep(10);
            count += 1;
            running = false;
        }

        DomainEvents.subscribe(TestEvent, handler1);
        DomainEvents.subscribe(TestEvent, handler1);

        await DomainEvents.dispatch(event);
        assert.equal(count, 2);
    });

    it('All listeners are executed even if one fails', async function () {
        const event = new TestEvent('Hello, world!');
        const stub = sinon.stub(logging, 'error').returns();

        let count = 0;

        /**
         * @param {TestEvent} receivedEvent
         */
        async function handler1() {
            await sleep(10);
            throw new Error('Test error');
        }

        /**
         * @param {TestEvent} receivedEvent
         */
        async function handler2() {
            await sleep(10);
            count += 1;
        }

        DomainEvents.subscribe(TestEvent, handler1);
        DomainEvents.subscribe(TestEvent, handler2);

        await DomainEvents.dispatch(event);
        assert.equal(count, 1);
        assert.equal(stub.calledTwice, true);
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
    });
});
