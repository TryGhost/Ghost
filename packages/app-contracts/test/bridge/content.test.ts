import { describe, expect, it } from 'vitest';

import { refusedContent } from '../../src/bridge/content.ts';

describe('what a write of content may contain', () => {
  it('refuses code injection with any value, on posts, pages and tags, at any depth', () => {
    for (const kind of ['posts', 'pages', 'tags'] as const) {
      for (const field of ['codeinjection_head', 'codeinjection_foot']) {
        for (const value of ['<script></script>', '', null]) {
          expect(refusedContent({ [kind]: [{ [field]: value }] }), `${kind} ${field}`).toBe(field);
        }
      }
    }
    expect(
      refusedContent({
        posts: [{ tags: [{ name: 'x', codeinjection_foot: '<script>' }] }],
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
