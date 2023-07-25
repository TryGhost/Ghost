import assert from 'assert/strict';
import {PostsBulkDestroyedEvent} from '../src/index';

describe('Post Events', function () {
    it('Can instantiate BulkDestroyEvent', function () {
        const event = PostsBulkDestroyedEvent.create(['1', '2', '3']);
        assert.ok(event);
        assert.equal(event.data.length, 3);
    });
});
