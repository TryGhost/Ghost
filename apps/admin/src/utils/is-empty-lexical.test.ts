import { describe, expect, it } from 'vitest';
import { isEmptyLexical } from './is-empty-lexical';

describe('isEmptyLexical', () => {
  it.each([
    null,
    undefined,
    '',
    'invalid JSON',
    'null',
    '{}',
    '{"root":{"children":[]}}',
    '{"root":{"children":[{"type":"paragraph","children":[]}]}}',
  ])('treats %s as empty', (lexical) => {
    expect(isEmptyLexical(lexical)).toBe(true);
  });

  it.each([
    '{"root":{"children":[{"type":"paragraph","children":[{"type":"text","text":"Hello"}]}]}}',
    '{"root":{"children":[{"type":"image"}]}}',
    '{"root":{"children":[{"type":"paragraph"},{"type":"paragraph"}]}}',
  ])('treats populated content as nonempty', (lexical) => {
    expect(isEmptyLexical(lexical)).toBe(false);
  });
});
