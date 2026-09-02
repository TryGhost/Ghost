import { describe, expect, it } from 'vitest';
import {
  humanizeLexicalDiff,
  lexicalEquals,
  LexicalParseError,
  normalizeLexicalForCompare,
  normalizeSiteUrls,
  parseLexical,
  stripDirection,
} from '@/editor/engine/lexical-compare';

const textNode = (text: string) => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  type: 'extended-text',
  version: 1,
});

const paragraph = (text: string, direction: string | null = null) => ({
  children: [textNode(text)],
  direction,
  format: '',
  indent: 0,
  type: 'paragraph',
  version: 1,
});

const doc = (children: unknown[], direction: string | null = null) => ({
  root: { children, direction, format: '', indent: 0, type: 'root', version: 1 },
});

describe('stripDirection', () => {
  it('removes direction from element nodes at every nesting level', () => {
    const input = {
      direction: 'ltr',
      children: [{ direction: 'ltr', children: [{ direction: null, text: 'x' }] }],
    };

    expect(stripDirection(input)).toEqual({
      children: [{ children: [{ direction: null, text: 'x' }] }],
    });
  });

  it('does not reach into card payloads', () => {
    const card = { type: 'html', html: '<p>x</p>', visibility: { direction: 'keep' } };

    expect(stripDirection({ children: [card] })).toEqual({ children: [card] });
  });

  it('leaves primitives and arrays of primitives untouched', () => {
    expect(stripDirection('a')).toBe('a');
    expect(stripDirection([1, null, 'b'])).toEqual([1, null, 'b']);
  });
});

describe('normalizeLexicalForCompare', () => {
  it('accepts strings and objects and yields the same output', () => {
    const asObject = doc([paragraph('Hello')]);

    expect(normalizeLexicalForCompare(JSON.stringify(asObject))).toBe(
      normalizeLexicalForCompare(asObject),
    );
  });

  it('is independent of key order', () => {
    const a = JSON.stringify(doc([paragraph('Hello')]));
    const b = JSON.stringify({
      root: {
        version: 1,
        type: 'root',
        indent: 0,
        format: '',
        direction: null,
        children: [
          {
            version: 1,
            type: 'paragraph',
            indent: 0,
            format: '',
            direction: null,
            children: [{ ...textNode('Hello') }],
          },
        ],
      },
    });

    expect(normalizeLexicalForCompare(a)).toBe(normalizeLexicalForCompare(b));
  });

  it('treats null, undefined, empty string and a childless root alike', () => {
    expect(normalizeLexicalForCompare(null)).toBe('[]');
    expect(normalizeLexicalForCompare(undefined)).toBe('[]');
    expect(normalizeLexicalForCompare('')).toBe('[]');
    expect(normalizeLexicalForCompare(doc([]))).toBe('[]');
  });
});

describe('lexicalEquals', () => {
  it('ignores direction differences at the root and at depth', () => {
    const nullDirections = doc([
      paragraph('Hello'),
      {
        children: [{ ...paragraph('Nested'), type: 'listitem', value: 1 }],
        direction: null,
        format: '',
        indent: 0,
        type: 'list',
        version: 1,
        listType: 'bullet',
        start: 1,
        tag: 'ul',
      },
    ]);
    const ltrDirections = doc(
      [
        paragraph('Hello', 'ltr'),
        {
          children: [{ ...paragraph('Nested', 'ltr'), type: 'listitem', value: 1 }],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'list',
          version: 1,
          listType: 'bullet',
          start: 1,
          tag: 'ul',
        },
      ],
      'ltr',
    );

    expect(lexicalEquals(nullDirections, ltrDirections)).toBe(true);
  });

  it('detects text edits', () => {
    expect(lexicalEquals(doc([paragraph('Hello')]), doc([paragraph('Hello!')]))).toBe(false);
  });

  it('detects added and removed blocks', () => {
    expect(lexicalEquals(doc([paragraph('A')]), doc([paragraph('A'), paragraph('B')]))).toBe(false);
  });
});

describe('parseLexical', () => {
  it('treats null, undefined and an empty string as a known empty document', () => {
    expect(parseLexical(null)).toBeNull();
    expect(parseLexical(undefined)).toBeNull();
    expect(parseLexical('')).toBeNull();
  });

  it('accepts a serialized or parsed document with a children array', () => {
    expect(parseLexical(doc([]))).toEqual(doc([]));
    expect(parseLexical(JSON.stringify(doc([])))).toEqual(doc([]));
  });

  it('throws a typed error for invalid JSON', () => {
    expect(() => parseLexical('{not json')).toThrow(LexicalParseError);
  });

  it.each(['{}', '{"root":{}}', '{"root":{"children":"invalid"}}', '[]', 'null', '"x"'])(
    'throws a typed error for the structurally invalid document %s',
    (invalid) => {
      expect(() => parseLexical(invalid)).toThrow(LexicalParseError);
      expect(() => lexicalEquals(invalid, doc([]))).toThrow(LexicalParseError);
      expect(() => lexicalEquals(doc([]), invalid)).toThrow(LexicalParseError);
      expect(() => humanizeLexicalDiff(invalid, doc([]))).toThrow(LexicalParseError);
    },
  );

  it('rejects a parsed object without a children array', () => {
    expect(() => parseLexical({ root: { children: 'invalid' } })).toThrow(
      'lexical root must be an object with a children array',
    );
  });
});

describe('normalizeSiteUrls', () => {
  const siteUrl = 'https://site.example';

  it('rewrites link node urls to the site-relative form', () => {
    const link = { type: 'link', url: `${siteUrl}/about/?q=1#top`, children: [] };

    expect(normalizeSiteUrls([link], siteUrl)).toEqual([
      { type: 'link', url: '/about/?q=1#top', children: [] },
    ]);
  });

  it('rewrites only the url-typed properties of cards', () => {
    const cards = [
      {
        type: 'image',
        src: `${siteUrl}/a.jpg`,
        href: `${siteUrl}/about/`,
        caption: `See ${siteUrl}/about/`,
      },
      {
        type: 'bookmark',
        url: `${siteUrl}/post/`,
        metadata: {
          icon: `${siteUrl}/icon.png`,
          thumbnail: `${siteUrl}/thumb.png`,
          title: siteUrl,
        },
      },
      {
        type: 'gallery',
        images: [{ src: `${siteUrl}/g.jpg`, caption: siteUrl }],
        caption: siteUrl,
      },
      { type: 'html', html: `<a href="${siteUrl}/about/">x</a>` },
      { type: 'markdown', markdown: `[x](${siteUrl}/about/)` },
      { type: 'call-to-action', buttonUrl: `${siteUrl}/about/` },
    ];

    expect(normalizeSiteUrls(cards, siteUrl)).toEqual([
      { type: 'image', src: '/a.jpg', href: '/about/', caption: `See ${siteUrl}/about/` },
      {
        type: 'bookmark',
        url: '/post/',
        metadata: { icon: '/icon.png', thumbnail: '/thumb.png', title: siteUrl },
      },
      { type: 'gallery', images: [{ src: '/g.jpg', caption: siteUrl }], caption: siteUrl },
      { type: 'html', html: `<a href="${siteUrl}/about/">x</a>` },
      { type: 'markdown', markdown: `[x](${siteUrl}/about/)` },
      { type: 'call-to-action', buttonUrl: `${siteUrl}/about/` },
    ]);
  });

  it('never rewrites text', () => {
    const nodes = [paragraph(`Read ${siteUrl}`)];

    expect(normalizeSiteUrls(nodes, siteUrl)).toEqual(nodes);
  });

  it('descends into element children', () => {
    const nodes = [
      { ...paragraph('x'), children: [{ type: 'link', url: `${siteUrl}/a/`, children: [] }] },
    ];

    expect(normalizeSiteUrls(nodes, siteUrl)).toEqual([
      { ...paragraph('x'), children: [{ type: 'link', url: '/a/', children: [] }] },
    ]);
  });

  it('leaves other hosts, relative urls and non-http urls alone', () => {
    const nodes = [
      { type: 'link', url: 'https://other.example/about/', children: [] },
      { type: 'link', url: '/about/', children: [] },
      { type: 'link', url: 'mailto:hi@site.example', children: [] },
      { type: 'link', url: 'https://site.example.evil/', children: [] },
    ];

    expect(normalizeSiteUrls(nodes, siteUrl)).toEqual(nodes);
  });

  it('ignores the protocol and tolerates a trailing slash on the site url', () => {
    const nodes = [{ type: 'link', url: 'http://site.example/about/', children: [] }];

    expect(normalizeSiteUrls(nodes, 'https://site.example/')).toEqual([
      { type: 'link', url: '/about/', children: [] },
    ]);
  });

  it('keeps the subdirectory of a subdirectory install and ignores paths outside it', () => {
    const nodes = [
      { type: 'link', url: 'https://site.example/blog/about/', children: [] },
      { type: 'link', url: 'https://site.example/other/', children: [] },
    ];

    expect(normalizeSiteUrls(nodes, 'https://site.example/blog')).toEqual([
      { type: 'link', url: '/blog/about/', children: [] },
      { type: 'link', url: 'https://site.example/other/', children: [] },
    ]);
  });

  it('returns the input untouched without a valid site url', () => {
    const nodes = [{ type: 'link', url: `${siteUrl}/about/`, children: [] }];

    expect(normalizeSiteUrls(nodes, '')).toBe(nodes);
    expect(normalizeSiteUrls(nodes, 'not a url')).toBe(nodes);
  });

  it('does not mutate the input', () => {
    const nodes = [{ type: 'image', src: `${siteUrl}/a.jpg` }];
    normalizeSiteUrls(nodes, siteUrl);

    expect(nodes[0]?.src).toBe(`${siteUrl}/a.jpg`);
  });
});

describe('lexicalEquals with a site url', () => {
  it('treats absolute and relative site urls as equal', () => {
    const absolute = doc([{ type: 'image', version: 1, src: 'https://site.example/a.jpg' }]);
    const relative = doc([{ type: 'image', version: 1, src: '/a.jpg' }]);

    expect(lexicalEquals(absolute, relative, 'https://site.example')).toBe(true);
    expect(lexicalEquals(absolute, relative)).toBe(false);
  });
});

describe('humanizeLexicalDiff', () => {
  it('annotates numeric path segments with the node type from the source document', () => {
    const from = doc([paragraph('Hello')]);
    const to = doc([paragraph('Hello world')]);

    expect(humanizeLexicalDiff(from, to)).toEqual([
      {
        type: 'CHANGE',
        path: 'root.children.0[paragraph].children.0[extended-text].text',
        value: 'Hello world',
        oldValue: 'Hello',
      },
    ]);
  });

  it('reports added blocks with a CREATE entry and removed blocks with a REMOVE entry', () => {
    const one = doc([paragraph('A')]);
    const two = doc([paragraph('A'), paragraph('B')]);

    expect(humanizeLexicalDiff(one, two)).toEqual([
      { type: 'CREATE', path: 'root.children.1', value: stripDirection(paragraph('B')) },
    ]);
    expect(humanizeLexicalDiff(two, one)).toEqual([
      {
        type: 'REMOVE',
        path: 'root.children.1[paragraph]',
        oldValue: stripDirection(paragraph('B')),
      },
    ]);
  });

  it('ignores direction-only differences', () => {
    expect(humanizeLexicalDiff(doc([paragraph('A')]), doc([paragraph('A', 'ltr')], 'ltr'))).toEqual(
      [],
    );
  });

  it('accepts serialized strings and missing documents', () => {
    expect(humanizeLexicalDiff(JSON.stringify(doc([paragraph('A')])), null)).toEqual([
      { type: 'REMOVE', path: 'root', oldValue: stripDirection(doc([paragraph('A')]).root) },
    ]);
    expect(humanizeLexicalDiff(null, doc([paragraph('A')]))).toEqual([
      { type: 'CREATE', path: 'root', value: stripDirection(doc([paragraph('A')]).root) },
    ]);
  });
});
