import { describe, expect, it } from 'vitest';

import { refusedContent } from '../../src/bridge/content.ts';

describe('what a write of content may contain', () => {
  it('refuses code injection with any value on the post, page or tag being written', () => {
    for (const kind of ['posts', 'pages', 'tags'] as const) {
      for (const field of ['codeinjection_head', 'codeinjection_foot']) {
        for (const value of ['<script></script>', '', null]) {
          expect(refusedContent({ [kind]: [{ [field]: value }] }), `${kind} ${field}`).toBe(field);
          expect(refusedContent({ [kind]: { [field]: value } }), `${kind} ${field}`).toBe(field);
          expect(refusedContent({ [field]: value }), field).toBe(field);
        }
      }
    }
  });

  it('refuses code injection with a value at any depth, but allows null on nested objects', () => {
    expect(
      refusedContent({
        posts: [{ tags: [{ name: 'x', codeinjection_foot: '<script>' }] }],
      }),
    ).toBe('codeinjection_foot');
    expect(
      refusedContent({ posts: [{ tags: [{ id: 'a', meta: { codeinjection_head: '' } }] }] }),
    ).toBe('codeinjection_head');
    // The tags of a post come back with both fields as `null`, so a post can send them back.
    expect(
      refusedContent({
        posts: [
          {
            updated_at: '2026-10-29T00:00:00.000Z',
            tags: [{ id: 'a', name: 'News', codeinjection_head: null, codeinjection_foot: null }],
          },
        ],
      }),
    ).toBeUndefined();
    expect(
      refusedContent({
        posts: [{ tags: [{ id: 'a', codeinjection_head: null }], codeinjection_foot: null }],
      }),
    ).toBe('codeinjection_foot');
  });

  it('refuses mobiledoc unless it is null', () => {
    expect(refusedContent({ posts: [{ mobiledoc: '{"cards":[]}' }] })).toBe('mobiledoc');
    expect(refusedContent({ pages: [{ mobiledoc: {} }] })).toBe('mobiledoc');
    expect(refusedContent({ posts: [{ mobiledoc: '' }] })).toBe('mobiledoc');
    expect(refusedContent({ posts: [{ title: 'x', mobiledoc: null }] })).toBeUndefined();
  });

  it('leaves the rest of a post, page or tag alone, cards and HTML included', () => {
    expect(
      refusedContent({
        posts: [
          {
            title: '<b>Hello</b>',
            html: '<script></script>',
            lexical: JSON.stringify({
              root: { type: 'root', children: [{ type: 'html', html: '<script></script>' }] },
            }),
            feature_image_caption: 'By <a href="https://example.com/">Jo</a>',
            status: 'published',
            tags: [{ name: 'News' }],
          },
        ],
      }),
    ).toBeUndefined();
    expect(refusedContent({ tags: [{ name: 'News', description: '<b>x</b>' }] })).toBeUndefined();
  });
});
