import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderFeed, feedLinks } from '../src/provider/feeds.ts';
import type { Post } from '../src/provider/selection.ts';
import type { AccessDecision } from '../src/provider/ghost-client.ts';

const media = (name: string, format = 'audio') => ({
  url: `https://site.test/${name}?a=1&b=2`,
  mime_type: `${format}/${format === 'audio' ? 'mpeg' : 'mp4'}`,
  byte_length: 123,
});
const card = (id: string, title: string | null = null, extra = {}) => ({
  type: 'addon',
  addonHandle: 'podcast',
  blockName: 'episode',
  id,
  props: {
    version: 1,
    show_id: 'one',
    title,
    offer_free: true,
    full_audio: media('full'),
    free_audio: media('free'),
    full_video: media('video', 'video'),
    ...extra,
  },
});
const post = (id: string, cards = [card('card')]): Post => ({
  id,
  uuid: `uuid-${id}`,
  title: 'Post title <&>',
  url: 'https://site.test/post/?a=1&b=2',
  status: 'published',
  published_at: '2026-09-23T12:00:00Z',
  custom_excerpt: null,
  card_revision: `revision-${id}`,
  lexical: JSON.stringify({ root: { children: cards } }),
});
const show = {
  id: 'one',
  title: 'Show <&>',
  description: 'Description & details',
  artwork: '',
  author: 'Author',
  language: 'en',
  explicit: false,
};
function client(pages: Post[][], access = false, visible = ['card', 'first', 'second']) {
  return {
    configuration: vi.fn(async () => ({ shows: [show] })),
    async *postPages() {
      for (const page of pages) {
        yield page;
      }
    },
    access: vi.fn(
      async (ids: string[]) =>
        new Map(
          ids.map((id) => [
            id,
            {
              access,
              visible_card_ids: visible,
              card_revision: `revision-${id}`,
            } as AccessDecision,
          ]),
        ),
    ),
  };
}
const feed = (
  ghost: ReturnType<typeof client>,
  format: 'audio' | 'video' = 'audio',
  member = null,
) => renderFeed(ghost, 'one', format, member, 'https://site.test', 'https://provider.test');
const xml = (source: string | null) =>
  new JSDOM(source!, { contentType: 'application/xml' }).window.document;

describe('podcast feeds', () => {
  it('walks all pages, emits every matching visible card, and uses safe escaped descriptions', async () => {
    const ghost = client([
      [post('skip', [card('card', null, { show_id: 'other' })])],
      [post('post', [card('first'), card('second', 'Override')])],
    ]);
    const document = xml(await feed(ghost));
    expect(document.querySelectorAll('item')).toHaveLength(2);
    expect([...document.querySelectorAll('item title')].map((n) => n.textContent)).toEqual([
      'Post title <&>',
      'Override',
    ]);
    expect(
      [...document.querySelectorAll('enclosure')].every(
        (n) => n.getAttribute('url') === media('free').url,
      ),
    ).toBe(true);
    expect(document.querySelector('item description')?.textContent).toBe(
      '<p>Post title &lt;&amp;&gt;</p><p><a href="https://site.test/post/?a=1&amp;b=2">Episode page</a></p>',
    );
    expect(ghost.access.mock.calls.every(([ids]) => ids.length <= 100)).toBe(true);
  });
  it('shares full/free/video selection and keeps GUIDs stable across title and media changes', async () => {
    const item = post('post', [card('first'), card('second')]);
    const publicFeed = xml(await feed(client([[item]])));
    const privateFeed = xml(await feed(client([[{ ...item, title: 'Changed' }]], true)));
    expect([...publicFeed.querySelectorAll('guid')].map((n) => n.textContent)).toEqual(
      [...privateFeed.querySelectorAll('guid')].map((n) => n.textContent),
    );
    expect(new Set([...publicFeed.querySelectorAll('guid')].map((n) => n.textContent)).size).toBe(
      2,
    );
    expect(privateFeed.querySelector('enclosure')?.getAttribute('url')).toBe(media('full').url);
    expect(
      xml(await feed(client([[item]], true), 'video'))
        .querySelector('enclosure')
        ?.getAttribute('type'),
    ).toBe('video/mp4');
    expect(xml(await feed(client([[item]]), 'video')).querySelectorAll('item')).toHaveLength(0);
  });
  it('bounds and deduplicates access batches and emits repeated candidates only once', async () => {
    const posts = Array.from({ length: 205 }, (_, index) => post(String(index)));
    const ghost = client([[...posts, posts[0]], [posts[1]]], true);
    expect(xml(await feed(ghost)).querySelectorAll('item')).toHaveLength(205);
    expect(ghost.access.mock.calls.map(([ids]) => ids.length)).toEqual([0, 100, 100, 5]);
  });
  it('omits hidden cards, ambiguous IDs, and cards removed between requests', async () => {
    expect(
      xml(
        await feed(client([[post('post', [card('first'), card('second')])]], true, ['first'])),
      ).querySelectorAll('item'),
    ).toHaveLength(1);
    expect(
      xml(
        await feed(client([[post('post', [card('first'), card('first')])]], true)),
      ).querySelectorAll('item'),
    ).toHaveLength(0);
    expect(xml(await feed(client([[]], true))).querySelectorAll('item')).toHaveLength(0);
  });
  it('fails the whole feed on later page/access failures and conflicting revisions', async () => {
    const ghost = client([[post('one')], [post('two')]], true);
    ghost.access.mockRejectedValueOnce(new Error('Invalid member'));
    await expect(feed(ghost)).rejects.toThrow('Invalid member');
    ghost.access
      .mockResolvedValueOnce(new Map())
      .mockResolvedValueOnce(
        new Map([['one', { access: true, visible_card_ids: ['card'], card_revision: 'old' }]]),
      );
    await expect(feed(ghost)).rejects.toThrow('revision');
    ghost.postPages = async function* () {
      yield [post('one')];
      throw new Error('Next page failed');
    };
    await expect(feed(ghost)).rejects.toThrow('Next page failed');
  });
  it('validates credentials on empty feeds and places private tokens only in private links', async () => {
    const ghost = client([]);
    const member = { uuid: 'member', key: 'key' };
    await renderFeed(ghost, 'one', 'audio', member, 'https://site.test', 'https://provider.test');
    expect(ghost.access).toHaveBeenCalledWith([], member);
    expect(feedLinks('https://provider.test', 'one').audio).toBe(
      'https://provider.test/feeds/one/audio.xml',
    );
    expect(
      new URL(feedLinks('https://provider.test', 'one', member).video).searchParams.get('key'),
    ).toBe('key');
  });
});
