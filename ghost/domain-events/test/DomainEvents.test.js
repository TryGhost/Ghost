const should = require('should');
const DomainEvents = require('../');

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

describe('DomainEvents', function () {
    it('Will call multiple subscribers with the event when it is dispatched', function (done) {
        const event = new TestEvent('Hello, world!');

        let called = 0;

        /**
         * @param {TestEvent} receivedEvent
         */
        function handler1(receivedEvent) {
            should.equal(receivedEvent, event);
            called += 1;
            if (called === 2) {
                done();
            }
        }

        /**
         * @param {TestEvent} receivedEvent
         */
        function handler2(receivedEvent) {
            should.equal(receivedEvent, event);
            called += 1;
            if (called === 2) {
                done();
            }
        }

        DomainEvents.subscribe(TestEvent, handler1);
        DomainEvents.subscribe(TestEvent, handler2);

        DomainEvents.dispatch(event);
    });
});
