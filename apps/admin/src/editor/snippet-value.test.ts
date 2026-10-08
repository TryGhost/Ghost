import { describe, expect, it } from 'vitest';
import { toSnippetValue } from './snippet-value';

const TEXT_NODE = {
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: 'Hello',
  type: 'extended-text',
  version: 1,
};
const LEXICAL = JSON.stringify({ namespace: 'KoenigEditor', nodes: [TEXT_NODE] });

function mobiledoc(sections: unknown[], cards: unknown[] = []): string {
  return JSON.stringify({ version: '0.3.1', atoms: [], cards, markups: [], sections });
}

function nodesOf(value: string | null): Array<Record<string, unknown>> {
  return (JSON.parse(value ?? '{}') as { nodes: Array<Record<string, unknown>> }).nodes;
}

describe('toSnippetValue', () => {
  it('passes lexical clipboard JSON through unchanged', () => {
    expect(toSnippetValue({ lexical: LEXICAL, mobiledoc: '{}' })).toBe(LEXICAL);
  });

  it('unwraps double-encoded lexical', () => {
    expect(toSnippetValue({ lexical: JSON.stringify(LEXICAL), mobiledoc: '{}' })).toBe(LEXICAL);
  });

  it('falls back to the mobiledoc when double-encoded lexical holds no nodes', () => {
    const legacy = mobiledoc([[1, 'p', [[0, [], 0, 'Legacy']]]]);

    for (const inner of [
      'not json',
      '{}',
      JSON.stringify({ namespace: 'KoenigEditor', nodes: [] }),
    ]) {
      const value = toSnippetValue({ lexical: JSON.stringify(inner), mobiledoc: legacy });
      expect(nodesOf(value).map((node) => node.text)).toEqual(['Legacy']);
    }
  });

  it('converts a mobiledoc-only snippet, unwrapping a single paragraph to its text', () => {
    const value = toSnippetValue({
      lexical: null,
      mobiledoc: mobiledoc([[1, 'p', [[0, [], 0, 'Legacy text']]]]),
    });

    expect(JSON.parse(value ?? '')).toMatchObject({
      namespace: 'KoenigEditor',
      nodes: [{ type: 'text', text: 'Legacy text' }],
    });
  });

  it('keeps every block of a multi-section mobiledoc snippet', () => {
    const value = toSnippetValue({
      lexical: null,
      mobiledoc: mobiledoc(
        [
          [1, 'h2', [[0, [], 0, 'Heading']]],
          [1, 'p', [[0, [], 0, 'Body']]],
          [10, 0],
        ],
        [['hr', {}]],
      ),
    });

    expect(nodesOf(value).map((node) => node.type)).toEqual([
      'heading',
      'paragraph',
      'horizontalrule',
    ]);
  });

  it('converts the mobiledoc when the lexical does not parse', () => {
    const value = toSnippetValue({
      lexical: '{not json',
      mobiledoc: mobiledoc([[1, 'p', [[0, [], 0, 'Legacy']]]]),
    });

    expect(nodesOf(value).map((node) => node.text)).toEqual(['Legacy']);
  });

  it('is null when there is nothing to insert', () => {
    expect(toSnippetValue({ lexical: null, mobiledoc: '{}' })).toBeNull();
    expect(toSnippetValue({ lexical: null, mobiledoc: '' })).toBeNull();
    expect(toSnippetValue({ lexical: null, mobiledoc: '{not json' })).toBeNull();
    expect(toSnippetValue({ lexical: null, mobiledoc: mobiledoc([[1, 'p', []]]) })).toBeNull();
  });
});
