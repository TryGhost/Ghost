import { describe, expect, it } from 'vitest';

import { refusedContent } from '../../src/bridge/content.ts';

const text = (value: string) => ({ type: 'extended-text', text: value, format: 0 });

/** A post body with Lexical made of these nodes. */
const post = (...children: unknown[]) => ({
  posts: [
    {
      title: 'Hello',
      lexical: JSON.stringify({ root: { type: 'root', children } }),
    },
  ],
});

describe('what a write of content may contain', () => {
  it('allows text: paragraphs, headings, lists, quotes, asides, links and rules', () => {
    expect(
      refusedContent(
        'posts',
        post(
          { type: 'paragraph', children: [text('Hi'), { type: 'linebreak' }, { type: 'tab' }] },
          { type: 'extended-heading', tag: 'h2', children: [text('Title')] },
          {
            type: 'list',
            listType: 'number',
            start: 3,
            children: [{ type: 'listitem', value: 3, children: [text('One')] }],
          },
          { type: 'extended-quote', children: [text('Quote')] },
          { type: 'aside', children: [text('Aside')] },
          {
            type: 'paragraph',
            children: [
              { type: 'link', url: 'https://example.com/', children: [text('a')] },
              { type: 'link', url: '/about/', children: [text('b')] },
              { type: 'link', url: 'mailto:hi@example.com', children: [text('c')] },
              { type: 'link', url: 'tel:+15551234', children: [text('d')] },
            ],
          },
          { type: 'horizontalrule' },
        ),
      ),
    ).toBeUndefined();
    expect(refusedContent('posts', { posts: [{ title: 'No content', lexical: null }] })).toBe(
      undefined,
    );
  });

  it('refuses every card, and node types Ghost does not know', () => {
    for (const type of [
      'html',
      'markdown',
      'embed',
      'image',
      'gallery',
      'codeblock',
      'bookmark',
      'video',
      'audio',
      'file',
      'callout',
      'button',
      'toggle',
      'header',
      'signup',
      'product',
      'call-to-action',
      'email',
      'email-cta',
      'transistor',
      'paywall',
      'at-link',
      'autolink',
      'something-new',
    ]) {
      expect(refusedContent('posts', post({ type, html: '<script></script>' })), type).toBe(
        `lexical with a "${type}" node`,
      );
    }
  });

  it('finds a card wherever it is nested', () => {
    expect(
      refusedContent(
        'pages',
        post({ type: 'paragraph', children: [{ type: 'aside', children: [{ type: 'html' }] }] }),
      ),
    ).toBe('lexical with a "html" node');
  });

  it('refuses the fields of text nodes that Ghost writes into the HTML unchecked', () => {
    expect(
      refusedContent('posts', post({ type: 'heading', tag: 'img src=x onerror=alert(1)' })),
    ).toBe('lexical with a "heading" node whose tag isn\'t h1 to h6');
    expect(
      refusedContent('posts', post({ type: 'list', listType: 'number', start: '1"><img' })),
    ).toBe('lexical with a "list" node whose type or start isn\'t plain');
    expect(refusedContent('posts', post({ type: 'list', listType: 'x' }))).toBe(
      'lexical with a "list" node whose type or start isn\'t plain',
    );
    expect(refusedContent('posts', post({ type: 'listitem', value: '1"' }))).toBe(
      'lexical with a "listitem" node whose value isn\'t a number',
    );
    for (const url of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'java\tscript:x',
      'data:text/html,x',
      'https://[',
    ]) {
      expect(refusedContent('posts', post({ type: 'link', url })), url).toBe(
        "lexical with a link to a URL that isn't http, https, mailto or tel",
      );
    }
    expect(refusedContent('posts', post({ type: 'link' }))).toBe(
      "lexical with a link to a URL that isn't http, https, mailto or tel",
    );
  });

  it('refuses Lexical that is not a document of nodes', () => {
    expect(refusedContent('posts', { posts: [{ lexical: '{' }] })).toBe("lexical that isn't JSON");
    expect(refusedContent('posts', { posts: [{ lexical: { root: {} } }] })).toBe(
      "lexical that isn't text",
    );
    expect(refusedContent('posts', { posts: [{ lexical: '{"root":{"type":"html"}}' }] })).toBe(
      'lexical without a root node',
    );
    expect(refusedContent('posts', { posts: [{ lexical: '[]' }] })).toBe(
      'lexical without a root node',
    );
    expect(refusedContent('posts', post({ children: [] }))).toBe(
      'lexical with a node that has no type',
    );
    expect(refusedContent('posts', post({ type: 'paragraph', children: [null] }))).toBe(
      'lexical with a "paragraph" node whose children aren\'t nodes',
    );
    expect(refusedContent('posts', post({ type: 'paragraph', children: 'text' }))).toBe(
      'lexical with a "paragraph" node whose children aren\'t nodes',
    );
  });

  it('copes with a node with more children than a call can take as arguments', () => {
    const children = Array.from({ length: 340_000 }, () => text('x'));
    expect(refusedContent('posts', post({ type: 'paragraph', children }))).toBeUndefined();
    children.push({ type: 'html' } as never);
    expect(refusedContent('posts', post({ type: 'paragraph', children }))).toBe(
      'lexical with a "html" node',
    );
  });

  it('copes with Lexical nested deeper than a recursive walk could go', () => {
    // Written as text, as `JSON.stringify` would itself overflow on a value this deep.
    const depth = 100_000;
    const lexical = `{"root":{"type":"root","children":[${'{"type":"paragraph","children":['.repeat(depth)}${']}'.repeat(depth)}]}}`;
    expect(refusedContent('posts', { posts: [{ lexical }] })).toBeUndefined();
  });

  it('refuses code injection with any value, on posts, pages and tags, at any depth', () => {
    for (const kind of ['posts', 'pages', 'tags'] as const) {
      for (const field of ['codeinjection_head', 'codeinjection_foot']) {
        for (const value of ['<script></script>', '', null]) {
          expect(refusedContent(kind, { [kind]: [{ [field]: value }] }), `${kind} ${field}`).toBe(
            field,
          );
        }
      }
    }
    expect(
      refusedContent('posts', {
        posts: [{ tags: [{ name: 'x', codeinjection_foot: '<script>' }] }],
      }),
    ).toBe('codeinjection_foot');
  });

  it('refuses mobiledoc unless it is null', () => {
    expect(refusedContent('posts', { posts: [{ mobiledoc: '{"cards":[]}' }] })).toBe('mobiledoc');
    expect(refusedContent('pages', { pages: [{ mobiledoc: {} }] })).toBe('mobiledoc');
    expect(refusedContent('posts', { posts: [{ mobiledoc: null }] })).toBeUndefined();
  });

  it('refuses a feature image caption with HTML in it', () => {
    expect(
      refusedContent('posts', { posts: [{ feature_image_caption: 'By <a href="x">Jo</a>' }] }),
    ).toBe('a feature_image_caption with HTML in it');
    expect(
      refusedContent('posts', { posts: [{ feature_image_caption: 'By Jo & Sam' }] }),
    ).toBeUndefined();
  });

  it('leaves the rest of a post, page or tag alone', () => {
    expect(
      refusedContent('posts', {
        posts: [
          {
            title: '<b>Hello</b>',
            html: '<script></script>',
            status: 'published',
            tags: [{ name: 'News' }],
            custom_excerpt: 'x',
          },
        ],
      }),
    ).toBeUndefined();
    // Tags have no Lexical, so a field by that name is just an unknown field Ghost drops.
    expect(refusedContent('tags', { tags: [{ name: 'News', description: '<b>x</b>' }] })).toBe(
      undefined,
    );
  });
});
