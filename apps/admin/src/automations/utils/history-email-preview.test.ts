import { describe, expect, it } from 'vitest';
import { emailTextExcerpt } from './history-email-preview';

const doc = (...children: object[]) => JSON.stringify({ root: { children } });
const text = (value: string) => ({ type: 'extended-text', text: value });
const paragraph = (...children: object[]) => ({ type: 'paragraph', children });

describe('email text excerpts', () => {
  it.each([
    ['malformed JSON', '{'],
    ['missing root children', JSON.stringify({ root: {} })],
    ['invalid child node', doc({ type: 'paragraph', children: [null] })],
  ])('rejects %s instead of returning an empty excerpt', (_description, lexical) => {
    expect(() => emailTextExcerpt(lexical)).toThrow();
  });

  it('reads paragraphs, headings, lists and link text in document order', () => {
    expect(
      emailTextExcerpt(
        doc(
          { type: 'extended-heading', children: [text('Hello')] },
          paragraph(
            text('Read '),
            { type: 'link', url: 'https://example.com', children: [text('this')] },
            text(' today.'),
          ),
          {
            type: 'list',
            children: [
              { type: 'listitem', children: [text('First item')] },
              { type: 'listitem', children: [text('Second item')] },
            ],
          },
        ),
      ),
    ).toBe('Hello Read this today. First item Second item');
  });

  it('skips rich cards and preserves literal text without interpreting markup', () => {
    expect(
      emailTextExcerpt(
        doc(
          { type: 'html', html: '<p>Hidden</p>' },
          { type: 'markdown', markdown: '**Hidden**' },
          { type: 'image', src: 'https://example.com/image.png' },
          paragraph(text('<b>Literal</b>'), { type: 'linebreak' }, text('Next line')),
        ),
      ),
    ).toBe('<b>Literal</b> Next line');
  });

  it.each([null, '', doc(), doc({ type: 'markdown', markdown: '# Hello' })])(
    'has no snippet for content without ordinary text',
    (lexical) => {
      expect(emailTextExcerpt(lexical)).toBe('');
    },
  );

  it('bounds a long snippet and indicates that more text exists', () => {
    expect(emailTextExcerpt(doc(paragraph(text('a'.repeat(800)))))).toBe(`${'a'.repeat(400)}…`);
  });
});
