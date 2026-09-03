import { OLD_SCHEMA_CORPUS } from '@/editor/engine/__fixtures__';
import { contentToText, lexicalToText } from './content-text';

/** A document as Koenig serializes it, recorded from a headless load. */
function koenigDocument(name: string): string {
  const found = OLD_SCHEMA_CORPUS.find((entry) => entry.name === name);
  if (!found) {
    throw new Error(`missing fixture ${name}`);
  }
  return JSON.stringify(found.after);
}

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

  it('leaves out the script and style bodies of an html card', () => {
    const card = {
      type: 'html',
      html: '<p>Visible</p><script>alert(1)</script><style>p { color: red }</style>',
    };

    expect(lexicalToText(doc(card))).toBe('Visible');
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

  // Koenig replaces Lexical's heading and quote nodes with its own, so this
  // reads the types it actually serializes rather than hand-built ones.
  it('marks headings and quotes the way markdown does', () => {
    expect(lexicalToText(koenigDocument('legacy-heading-quote-nodes'))).toBe(
      '## Heading two\n\n> A quotation\n\nBody',
    );
  });

  it('still marks the plain heading and quote types another editor can write', () => {
    const heading = { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Title' }] };
    const quote = { type: 'quote', children: [{ type: 'text', text: 'Said so' }] };
    const aside = { type: 'aside', children: [{ type: 'text', text: 'On the side' }] };

    expect(lexicalToText(doc(heading, quote, aside))).toBe(
      '## Title\n\n> Said so\n\n> On the side',
    );
  });

  it('numbers an ordered list and bullets an unordered one', () => {
    const item = (text: string) => ({
      type: 'listitem',
      children: [{ type: 'text', text }],
    });
    const bullets = { type: 'list', listType: 'bullet', children: [item('a'), item('b')] };
    const numbers = { type: 'list', listType: 'number', children: [item('a'), item('b')] };

    expect(lexicalToText(doc(bullets))).toBe('- a\n- b');
    expect(lexicalToText(doc(numbers))).toBe('1. a\n2. b');
  });

  it('indents a nested list under its item', () => {
    const item = (text: string, ...children: unknown[]) => ({
      type: 'listitem',
      children: [{ type: 'text', text }, ...children],
    });
    const nested = { type: 'list', listType: 'bullet', children: [item('inner')] };
    const outer = { type: 'list', listType: 'bullet', children: [item('outer', nested)] };

    expect(lexicalToText(doc(outer))).toBe('- outer\n  - inner');
  });

  it('leaves out a card that carries no text', () => {
    const image = { type: 'image', src: 'https://example.com/a.png' };

    expect(lexicalToText(doc(paragraph('Before'), image, paragraph('After')))).toBe(
      'Before\n\nAfter',
    );
  });

  // Every property Koenig marks `wordCount: true`; the banner promises the
  // writer their content, so a card losing its text is silent data loss.
  it.each<[string, Record<string, unknown>, string]>([
    [
      'bookmark',
      {
        type: 'bookmark',
        title: 'Bookmark title',
        description: 'Bookmark description',
        url: 'https://example.com/',
        caption: 'Bookmark caption',
      },
      'Bookmark title\nBookmark description\nhttps://example.com/\nBookmark caption',
    ],
    [
      'call-to-action',
      { type: 'call-to-action', textValue: '<p>Subscribe now</p>' },
      'Subscribe now',
    ],
    ['callout', { type: 'callout', calloutText: '<p>Watch out</p>' }, 'Watch out'],
    [
      'codeblock',
      { type: 'codeblock', code: 'if (a < b) {}', caption: '<p>Code caption</p>' },
      'if (a < b) {}\nCode caption',
    ],
    [
      'embed',
      { type: 'embed', html: '<iframe></iframe>', caption: 'Embed caption' },
      'Embed caption',
    ],
    [
      'file',
      { type: 'file', fileTitle: 'File title', fileCaption: 'File caption' },
      'File title\nFile caption',
    ],
    ['gallery', { type: 'gallery', caption: 'Gallery caption' }, 'Gallery caption'],
    [
      'header',
      { type: 'header', header: '<span>Big</span>', subheader: '<span>Small</span>' },
      'Big\nSmall',
    ],
    ['html', { type: 'html', html: '<div>Raw html text</div>' }, 'Raw html text'],
    ['image', { type: 'image', src: 'a.png', caption: '<p>Image caption</p>' }, 'Image caption'],
    ['markdown', { type: 'markdown', markdown: '## From a card' }, '## From a card'],
    [
      'product',
      { type: 'product', productTitle: 'Product', productDescription: '<p>Sold here</p>' },
      'Product\nSold here',
    ],
    [
      'signup',
      { type: 'signup', disclaimer: 'No spam', header: 'Join', subheader: 'Today' },
      'No spam\nJoin\nToday',
    ],
    [
      'toggle',
      { type: 'toggle', heading: '<p>Question</p>', content: '<p>Answer</p>' },
      'Question\nAnswer',
    ],
    ['video', { type: 'video', src: 'a.mp4', caption: 'Video caption' }, 'Video caption'],
  ])('keeps the text a %s card holds', (_type, card, expected) => {
    expect(lexicalToText(doc(card))).toBe(expected);
  });

  it('leaves out card properties the editor does not count as text', () => {
    const embed = { type: 'embed', html: '<iframe src="https://example.com"></iframe>' };

    expect(lexicalToText(doc(embed))).toBe('');
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
