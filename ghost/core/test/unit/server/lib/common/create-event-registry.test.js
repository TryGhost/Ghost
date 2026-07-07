const assert = require('node:assert/strict');
const createEventRegistry = require('../../../../../core/server/lib/common/create-event-registry');

describe('createEventRegistry', function () {
    it('creates an emitter with the raised listener cap', function () {
        const events = createEventRegistry();

        assert.equal(events.getMaxListeners(), 100);
    });

    it('reports registered named listeners', function () {
        const events = createEventRegistry();
        events.on('post.published', function namedListener() {});

        assert.equal(events.hasRegisteredListener('post.published', 'namedListener'), true);
        assert.equal(events.hasRegisteredListener('post.published', 'otherListener'), false);
    });

    it('creates independent emitters', function () {
        const eventsA = createEventRegistry();
        const eventsB = createEventRegistry();
        let fired = 0;
        eventsA.on('settings.edited', () => {
            fired += 1;
        });

        eventsB.emit('settings.edited');
        assert.equal(fired, 0);

        eventsA.emit('settings.edited');
        assert.equal(fired, 1);
    });
});
