const assert = require('assert/strict');
const events = require('../../../../core/server/lib/common/events');

describe('Events', function () {
    describe('Has registered listener', function () {
        it('can check if the listener has been registered', function () {
            assert.equal(false, events.hasRegisteredListener('post.added', 'namedHandler'));

            events.on('post.added', function namedHandler() { });
            assert.equal(true, events.hasRegisteredListener('post.added', 'namedHandler'));

            events.removeAllListeners();
            assert.equal(false, events.hasRegisteredListener('post.added', 'namedHandler'));
        });
    });
});
