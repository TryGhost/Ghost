import assert from 'assert/strict';
import {posts} from '../src/index';

describe('Expansions', function () {
    it('Exposes correct expansions', function () {
        assert.ok(posts);
        assert.equal(posts[0].key, 'primary_tag');
    });
});
