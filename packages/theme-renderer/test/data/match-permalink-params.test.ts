/**
 * The per-permalink matcher memo (src/data/match-permalink-params.ts) must be
 * scoped: bounded in size (a real site's permalink set is a handful of route
 * strings — unbounded growth means something is generating permalinks
 * dynamically) and cleared alongside the renderer's other module singletons
 * on resetRendererDeps/teardown.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'vitest';
import matchPermalinkParams, {
  MATCH_CACHE_MAX,
  clearMatchCache,
  matchCacheSize,
} from '../../src/data/match-permalink-params.ts';
import { resetRendererDeps } from '../../src/seam/deps.ts';

afterEach(function () {
  clearMatchCache();
});

describe('data/match-permalink-params cache scoping', function () {
  it('memoizes per permalink string', function () {
    clearMatchCache();
    assert.deepEqual(matchPermalinkParams('/:slug/', '/welcome/'), { slug: 'welcome' });
    assert.equal(matchCacheSize(), 1);
    assert.deepEqual(matchPermalinkParams('/:slug/', '/other/'), { slug: 'other' });
    assert.equal(matchCacheSize(), 1);
  });

  it('caps the cache: a full clear at the bound instead of unbounded growth', function () {
    clearMatchCache();
    for (let i = 0; i < MATCH_CACHE_MAX; i++) {
      matchPermalinkParams(`/prefix-${i}/:slug/`, '/nope');
    }
    assert.equal(matchCacheSize(), MATCH_CACHE_MAX);

    // one more distinct permalink → full clear, then the newcomer cached
    assert.deepEqual(matchPermalinkParams('/overflow/:slug/', '/overflow/x/'), { slug: 'x' });
    assert.equal(matchCacheSize(), 1);
  });

  it('clears on resetRendererDeps (test teardown path)', function () {
    clearMatchCache();
    matchPermalinkParams('/:slug/', '/welcome/');
    assert.ok(matchCacheSize() > 0);
    resetRendererDeps();
    assert.equal(matchCacheSize(), 0);
    // still functional after the clear
    assert.deepEqual(matchPermalinkParams('/:slug/', '/welcome/'), { slug: 'welcome' });
  });
});
