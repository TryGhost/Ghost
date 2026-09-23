import { describe, expect, it } from 'vitest';
import { cardRevision } from '../../../../../core/server/services/posts/card-revision';

describe('card access revision', () => {
  it('distinguishes content and access edits within the same timestamp', () => {
    const post = {
      lexical: '{"full":"old"}',
      visibility: 'public',
      status: 'published',
      updated_at: '2026-09-23T12:00:00.000Z',
    };
    const revision = cardRevision(post);
    expect(cardRevision({ ...post, lexical: '{"full":"new"}' })).not.toBe(revision);
    expect(cardRevision({ ...post, visibility: 'paid' })).not.toBe(revision);
    expect(cardRevision({ ...post, status: 'draft' })).not.toBe(revision);
  });
  it('includes tier identities without depending on relation order', () => {
    const post = {
      lexical: '{}',
      status: 'published',
      visibility: 'tiers',
      tiers: [{ id: 'one' }, { id: 'two' }],
    };
    expect(cardRevision({ ...post, tiers: [...post.tiers].reverse() })).toBe(cardRevision(post));
    expect(cardRevision({ ...post, tiers: [{ id: 'three' }] })).not.toBe(cardRevision(post));
  });
});
