import assert from 'assert/strict';
import {TagDeletedEvent} from '../src';

describe('TagDeletedEvent', function () {
    it('should create a TagDeletedEvent', function () {
        const event = TagDeletedEvent.create({id: '1', slug: 'tag-1'});

        const actual = event instanceof TagDeletedEvent;
        const expected = true;

        assert.equal(actual, expected, 'TagDeletedEvent.create() did not return an instance of TagDeletedEvent');
    });
});
