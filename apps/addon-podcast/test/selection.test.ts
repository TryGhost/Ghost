import { describe, expect, it } from 'vitest';
import { extractEpisodes, selectMedia } from '../src/provider/selection.ts';

const audio = { url: 'https://site.test/full.mp3', mime_type: 'audio/mpeg', byte_length: 42 };
const props = {
  version: 1,
  show_id: 'one',
  full_audio: audio,
  free_audio: { ...audio, url: 'https://site.test/free.mp3' },
  offer_free: true,
};
const card = (id: string, overrides = {}) => ({
  type: 'addon',
  addonHandle: 'podcast',
  blockName: 'episode',
  id,
  props,
  ...overrides,
});
const post = (children: unknown[]) => ({
  id: '0123456789abcdef01234567',
  uuid: 'post-uuid',
  title: 'Current post title',
  url: 'https://site.test/post/',
  status: 'published',
  published_at: '2026-09-23T12:00:00Z',
  card_revision: 'revision-one',
  custom_excerpt: null,
  lexical: JSON.stringify({ root: { children } }),
});

describe('podcast selection', () => {
  it('omits card IDs that cannot be encoded into stable feed identity', () => {
    expect(extractEpisodes(post([card('\ud800')]))).toEqual([]);
  });
  it('selects only visible cards, full media first, then explicitly offered free media', () => {
    expect(selectMedia(props, 'audio', { access: true, visible: false })).toBeNull();
    expect(selectMedia(props, 'audio', { access: true, visible: true })).toEqual({
      ...audio,
      variant: 'full',
    });
    expect(selectMedia(props, 'audio', { access: false, visible: true })?.variant).toBe('free');
    expect(
      selectMedia({ ...props, full_audio: null }, 'audio', { access: true, visible: true })
        ?.variant,
    ).toBe('free');
    expect(
      selectMedia({ ...props, offer_free: false }, 'audio', { access: false, visible: true }),
    ).toBeNull();
    expect(selectMedia(props, 'video', { access: true, visible: true })).toBeNull();
  });
  it.each([
    { url: 'javascript:alert(1)' },
    { url: '/relative.mp3' },
    { mime_type: 'video/mp4' },
    { mime_type: 'audio/' },
    { byte_length: -1 },
    { byte_length: 1.5 },
    { byte_length: null },
  ])('ignores an invalid media slot: %j', (invalid) => {
    expect(
      selectMedia({ full_audio: { ...audio, ...invalid } }, 'audio', {
        access: true,
        visible: true,
      }),
    ).toBeNull();
  });
  it('extracts every real podcast card in document order with current title fallback', () => {
    const episodes = extractEpisodes(
      post([
        card('one'),
        { type: 'paragraph', children: [card('two', { props: { ...props, title: 'Override' } })] },
        { type: 'text', props: { children: [card('fake')] } },
      ]),
    );
    expect(episodes.map((item) => [item.cardId, item.title])).toEqual([
      ['one', 'Current post title'],
      ['two', 'Override'],
    ]);
    expect(extractEpisodes(post([card('one', { addonHandle: 'other' })]))).toEqual([]);
  });
  it('omits ambiguous, invalid and unpublished cards, without rejecting nullable props', () => {
    expect(
      extractEpisodes(
        post([
          card('one'),
          card('one', { blockName: 'other' }),
          card(''),
          card('three', { props: null }),
        ]),
      ),
    ).toEqual([]);
    expect(extractEpisodes({ ...post([card('one')]), status: 'draft' })).toEqual([]);
    expect(extractEpisodes({ ...post([]), lexical: '{bad json' })).toEqual([]);
    expect(
      extractEpisodes(
        post([card('one', { props: { ...props, title: null, full_audio: null } })]),
      )[0].title,
    ).toBe('Current post title');
  });
});
