import assert from 'assert/strict';
import {
    PostsBulkDestroyedEvent,
    PostsBulkUnpublishedEvent,
    PostsBulkFeaturedEvent,
    PostsBulkUnfeaturedEvent
} from '../src/index';

describe('Post Events', function () {
    it('Can instantiate BulkDestroyEvent', function () {
        const event = PostsBulkDestroyedEvent.create(['1', '2', '3']);
        assert.ok(event);
        assert.equal(event.data.length, 3);
    });

    it('Can instantiate PostsBulkUnpublishedEvent', function () {
        const event = PostsBulkUnpublishedEvent.create(['1', '2', '3']);
        assert.ok(event);
        assert.equal(event.data.length, 3);
    });

    it('Can instantiate PostsBulkFeaturedEvent', function () {
        const event = PostsBulkFeaturedEvent.create(['1', '2', '3']);
        assert.ok(event);
        assert.equal(event.data.length, 3);
    });

    it('Can instantiate PostsBulkUnfeaturedEvent', function () {
        const event = PostsBulkUnfeaturedEvent.create(['1', '2', '3']);
        assert.ok(event);
        assert.equal(event.data.length, 3);
    });
});
