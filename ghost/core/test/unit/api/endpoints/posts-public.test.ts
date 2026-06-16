import assert from 'node:assert/strict';

const controller = require('../../../../core/server/api/endpoints/posts-public') as any;

describe('Unit: posts-public read cache key (gift links)', function () {
    function keyFor(giftLink: {post_id: string; token: string} | null) {
        const frame = {
            options: {context: giftLink ? {giftLink} : {}},
            data: {id: 'post-1'}
        };
        return JSON.stringify(controller.read.generateCacheKeyData(frame));
    }

    it('varies the cache key when a gift link is present (no collision with anonymous)', function () {
        assert.notEqual(keyFor(null), keyFor({post_id: 'post-1', token: 'tok'}));
    });

    it('is stable for the plain anonymous read', function () {
        assert.equal(keyFor(null), keyFor(null));
    });

    it('keys by the gift post id, not the token (<=1 active link per post)', function () {
        assert.equal(
            keyFor({post_id: 'post-1', token: 'aaa'}),
            keyFor({post_id: 'post-1', token: 'bbb'})
        );
    });
});
