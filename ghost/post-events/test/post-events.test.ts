import assert from 'assert/strict';
import {
    PostDeletedEvent,
    PostsBulkDestroyedEvent,
    PostsBulkUnpublishedEvent,
    PostsBulkUnscheduledEvent,
    PostsBulkFeaturedEvent,
    PostsBulkUnfeaturedEvent,
    PostsBulkAddTagsEvent
} from '../src/index';

describe('Post Events', function () {
    it('Can instantiate PostDeletedEvent', function () {
        const event = PostDeletedEvent.create({id: 'post-id-1', data: {}});
        assert.ok(event);
        assert.equal(event.id, 'post-id-1');
    });

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

    it('Can instantiate PostsBulkUnscheduledEvent', function () {
        const event = PostsBulkUnscheduledEvent.create(['1', '2', '3']);
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

    it('Can instantiate PostsBulkAddTagsEvent', function () {
        const event = PostsBulkAddTagsEvent.create(['1', '2', '3']);
        assert.ok(event);
        assert.equal(event.data.length, 3);
    });
});
