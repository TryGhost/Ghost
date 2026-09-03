import { contentToText, lexicalToText } from './content-text';

function doc(...children: unknown[]): string {
  return JSON.stringify({ root: { type: 'root', children } });
}

function paragraph(...text: string[]) {
  return {
    type: 'paragraph',
    children: text.map((value) => ({ type: 'text', text: value })),
  };
}

describe('lexicalToText', () => {
  it('joins blocks with a blank line', () => {
    expect(lexicalToText(doc(paragraph('First'), paragraph('Second')))).toBe('First\n\nSecond');
  });

  it('concatenates the inline runs of a paragraph', () => {
    expect(lexicalToText(doc(paragraph('Hello ', 'there')))).toBe('Hello there');
  });

  it('keeps a soft line break inside a block', () => {
    const block = {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'One' },
        { type: 'linebreak' },
        { type: 'text', text: 'Two' },
      ],
    };

    expect(lexicalToText(doc(block))).toBe('One\nTwo');
  });

  it('marks headings and quotes the way markdown does', () => {
    const heading = { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Title' }] };
    const quote = { type: 'quote', children: [{ type: 'text', text: 'Said so' }] };

    expect(lexicalToText(doc(heading, quote))).toBe('## Title\n\n> Said so');
  });

  it('numbers an ordered list and bullets an unordered one', () => {
    const item = (text: string) => ({
      type: 'listitem',
      children: [{ type: 'text', text }],
    });
    const bullets = { type: 'list', listType: 'bullet', children: [item('a'), item('b')] };
    const numbers = { type: 'list', listType: 'number', children: [item('a'), item('b')] };

    expect(lexicalToText(doc(bullets))).toBe('- a\n\n- b');
    expect(lexicalToText(doc(numbers))).toBe('1. a\n\n2. b');
  });

  it('keeps the text a markdown card holds', () => {
    const card = { type: 'markdown', markdown: '## From a card' };

    expect(lexicalToText(doc(card))).toBe('## From a card');
  });

  it('leaves out a card that carries no text', () => {
    const image = { type: 'image', src: 'https://example.com/a.png' };

    expect(lexicalToText(doc(paragraph('Before'), image, paragraph('After')))).toBe(
      'Before\n\nAfter',
    );
  });

  it.each([['not json'], ['{"root":{}}'], [null], ['']])(
    'yields nothing for unreadable lexical (%s)',
    (input) => {
      expect(lexicalToText(input)).toBe('');
    },
  );
});

describe('contentToText', () => {
  it('puts the title above the body', () => {
    expect(contentToText('My post', doc(paragraph('Words')))).toBe('My post\n\nWords');
  });

  it('drops a blank title rather than leaving a leading gap', () => {
    expect(contentToText('   ', doc(paragraph('Words')))).toBe('Words');
  });

  it('copies the title alone when the body is empty', () => {
    expect(contentToText('My post', null)).toBe('My post');
  });
});
