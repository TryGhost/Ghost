import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { secondGhostEnv } from '../with-second-ghost.ts';

describe('secondGhostEnv', () => {
  it("keeps each checkout out of the others' Redis keys", () => {
    const env = secondGhostEnv('one', '2401');
    assert.equal(env.GHOST_DEV_BACKEND_PORT_2, '3401');
    assert.equal(env.adapters__cache__postsPublic__adapter, 'Redis');
    assert.equal(env.adapters__cache__postsPublic__keyPrefix, 'one:posts-public:');
    assert.equal(env.hostSettings__postsPublicCache__enabled, 'true');
    assert.equal(env.adapters__cache__tagsPublic__keyPrefix, 'one:tags-public:');
    assert.equal(env.adapters__cache__imageSizes__keyPrefix, 'one:image-sizes:');
  });
});
