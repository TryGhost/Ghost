import { describe, expect, it } from 'vitest';
import {
  humanizeLexicalDiff,
  lexicalEquals,
  normalizeLexicalForCompare,
  stripDirection,
  stripSiteUrl,
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

describe('stripSiteUrl', () => {
  it('removes every occurrence of the site URL', () => {
    expect(
      stripSiteUrl('a https://site.example/x b https://site.example/y', 'https://site.example'),
    ).toBe('a /x b /y');
  });

  it('returns the input unchanged for an empty site URL', () => {
    expect(stripSiteUrl('https://site.example/x', '')).toBe('https://site.example/x');
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
