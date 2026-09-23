import { describe, expect, it, vi } from 'vitest';
import { player as getPlayer } from '../src/provider/player.ts';

const player = (ghost: Parameters<typeof getPlayer>[0], input: Parameters<typeof getPlayer>[1]) =>
  getPlayer(ghost, input, 'https://provider.test');

const id = '0123456789abcdef01234567';
const full = { url: 'https://site.test/full.mp3', mime_type: 'audio/mpeg', byte_length: 42 };
const free = { ...full, url: 'https://site.test/free.mp3' };
const props = { version: 1, show_id: 'one', full_audio: full, free_audio: free, offer_free: true };
const card = {
  type: 'addon',
  addonHandle: 'podcast',
  blockName: 'episode',
  id: 'episode-one',
  props,
};
function client(access = false, visible = true) {
  return {
    configuration: vi.fn(async () => ({
      shows: [
        {
          id: 'one',
          title: 'My show',
          description: '',
          author: '',
          artwork: '',
          language: 'en',
          explicit: false,
        },
      ],
    })),
    post: vi.fn(async () => ({
      id,
      uuid: 'post-uuid',
      title: 'Current title',
      status: 'published',
      url: 'https://site.test/post/',
      custom_excerpt: null,
      published_at: '2026-09-23T12:00:00Z',
      card_revision: 'revision-one',
      lexical: JSON.stringify({ root: { children: [card] } }),
    })),
    access: vi.fn(
      async () =>
        new Map([
          [
            id,
            {
              access,
              card_revision: 'revision-one',
              visible_card_ids: visible ? ['episode-one'] : [],
            },
          ],
        ]),
    ),
  };
}

describe('player provider', () => {
  it('fails closed when media and access were read from different post revisions', async () => {
    const ghost = client(true);
    const post = await ghost.post();
    ghost.post.mockResolvedValueOnce({ ...post, card_revision: 'revision-two' });
    await expect(player(ghost, { post_id: id, card_id: 'episode-one' })).rejects.toThrow(
      'revision',
    );
  });
  it('selects free media using authoritative post/card data and current title', async () => {
    const ghost = client();
    const result = await player(ghost, { post_id: id, card_id: 'episode-one' });
    expect(result).toMatchObject({
      state: 'ready',
      episode: { title: 'Current title', card_id: 'episode-one' },
      media: { audio: { ...free, variant: 'free' }, video: null },
    });
    expect(JSON.stringify(result)).not.toContain(full.url);
    expect(ghost.access).toHaveBeenCalledWith([id], undefined);
  });
  it('does not expose even free media or metadata for direct hidden-card requests', async () => {
    expect(await player(client(true, false), { post_id: id, card_id: 'episode-one' })).toEqual({
      state: 'hidden',
    });
  });
  it('passes credentials for every request and selects full media only with access', async () => {
    const ghost = client(true);
    const member = { uuid: 'member', key: 'secret' };
    expect(await player(ghost, { post_id: id, card_id: 'episode-one', member })).toMatchObject({
      media: { audio: { ...full, variant: 'full' } },
    });
    expect(ghost.access).toHaveBeenCalledWith([id], member);
    const result = await player(ghost, { post_id: id, card_id: 'episode-one', member });
    if (!('feeds' in result)) {
      throw new Error('Expected subscription links');
    }
    expect(new URL(result.feeds.audio).searchParams.get('uuid')).toBe(member.uuid);
    expect(new URL(result.feeds.audio).searchParams.get('key')).toBe(member.key);
    ghost.access.mockRejectedValueOnce(new Error('Invalid member'));
    await expect(player(ghost, { post_id: id, card_id: 'missing', member })).rejects.toThrow(
      'Invalid member',
    );
  });
  it('requires matching published post and exact unambiguous card identity', async () => {
    expect(await player(client(), { post_id: id, card_id: 'other' })).toEqual({ state: 'missing' });
    const ghost = client();
    const post = await ghost.post();
    ghost.post.mockResolvedValueOnce({ ...post, status: 'scheduled' });
    expect(await player(ghost, { post_id: id, card_id: 'episode-one' })).toEqual({
      state: 'missing',
    });
    ghost.post.mockResolvedValueOnce({
      ...post,
      lexical: JSON.stringify({ root: { children: [card, card] } }),
    });
    expect(await player(ghost, { post_id: id, card_id: 'episode-one' })).toEqual({
      state: 'missing',
    });
  });
  it('returns a bounded shell for a visible card with no eligible file', async () => {
    const ghost = client();
    const post = await ghost.post();
    ghost.post.mockResolvedValueOnce({
      ...post,
      lexical: JSON.stringify({
        root: { children: [{ ...card, props: { ...props, free_audio: null } }] },
      }),
    });
    expect(await player(ghost, { post_id: id, card_id: 'episode-one' })).toMatchObject({
      state: 'shell',
      media: { audio: null, video: null },
    });
  });
  it('fails if Ghost omits an access decision rather than guessing a shell', async () => {
    const ghost = client();
    ghost.access.mockResolvedValueOnce(new Map());
    await expect(player(ghost, { post_id: id, card_id: 'episode-one' })).rejects.toThrow();
  });
});
