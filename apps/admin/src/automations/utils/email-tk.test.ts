import { describe, expect, it } from 'vitest';
import { bodyTextHasTk, inspectEmailTk } from './email-tk';

const lexical = (children: unknown[]) => JSON.stringify({ root: { children } });
const paragraph = (text: string, type = 'extended-text') => ({
  type: 'paragraph',
  children: [{ type, text }],
});

describe('automation email TK inspection', () => {
  it.each(['TK', 'TKTK', '[TK],', '(TK)', 'tk', 'TkTk', 'word—TK—word', 'ATK then TK'])(
    'matches Koenig body markers: %s',
    (text) => expect(bodyTextHasTk(text)).toBe(true),
  );
  it.each(['', 'Talk', 'ATK', 'TKs', 'network', 'end.TK', 'TK.word', 'tK', 'éTK', 'TK2'])(
    'ignores non-markers: %s',
    (text) => expect(bodyTextHasTk(text)).toBe(false),
  );
  it('keeps post title semantics for subjects and Koenig semantics for bodies', () => {
    expect(inspectEmailTk('tk', lexical([paragraph('tk')]))).toEqual({
      subject: false,
      body: true,
      contentError: false,
    });
    expect(inspectEmailTk('[TKTK]', lexical([paragraph('Finished')]))).toEqual({
      subject: true,
      body: false,
      contentError: false,
    });
  });
  it.each(['text', 'extended-text', 'tk'])('reads unopened %s nodes', (type) => {
    expect(inspectEmailTk('TK', lexical([paragraph('TK', type)]))).toEqual({
      subject: true,
      body: true,
      contentError: false,
    });
  });
  it('does not trust stale serialized TK node types', () => {
    expect(inspectEmailTk('', lexical([paragraph('Finished', 'tk')])).body).toBe(false);
  });
  it('preserves formatted text and word boundaries', () => {
    const children = (text: string) => [
      { type: 'text', text },
      { type: 'text', text: 'TK', format: 1 },
    ];
    expect(inspectEmailTk('', lexical([{ type: 'paragraph', children: children('A') }])).body).toBe(
      false,
    );
    expect(
      inspectEmailTk('', lexical([{ type: 'paragraph', children: children('A ') }])).body,
    ).toBe(true);
    expect(inspectEmailTk('', lexical([paragraph('T'), paragraph('K')])).body).toBe(false);
    expect(
      inspectEmailTk('', lexical([paragraph('Welcome'), paragraph('TK: Add a link')])).body,
    ).toBe(true);
  });
  it.each([
    ['image', 'caption'],
    ['bookmark', 'caption'],
    ['embed', 'caption'],
    ['callout', 'calloutText'],
    ['email-cta', 'html'],
    ['call-to-action', 'textValue'],
    ['call-to-action', 'sponsorLabel'],
    ['product', 'productTitle'],
    ['product', 'productDescription'],
  ])('reads %s nested editor field %s', (type, field) => {
    expect(
      inspectEmailTk('', lexical([{ type, [field]: '<p>Write <strong>TKTK</strong> here</p>' }]))
        .body,
    ).toBe(true);
    expect(
      inspectEmailTk('', lexical([{ type, [field]: '<a href="https://example.org/TK">Ready</a>' }]))
        .body,
    ).toBe(false);
  });
  it('ignores raw source cards, URLs, identifiers and metadata', () => {
    expect(
      inspectEmailTk(
        '',
        lexical([
          { type: 'html', html: '<p>TK</p>' },
          { type: 'markdown', markdown: 'TK' },
          { type: 'bookmark', url: 'https://example.org/TK', metadata: { title: 'TK' } },
          { type: 'button', buttonText: 'TK', buttonUrl: 'TK' },
          { type: 'image', alt: 'TK', src: 'TK', id: 'TK' },
        ]),
      ).body,
    ).toBe(false);
  });
  it.each([
    '{',
    'null',
    '{}',
    '{"root":{"children":[null]}}',
    lexical([{ type: 'text', text: 123 }]),
    lexical([{ type: 'callout', calloutText: {} }]),
  ])('reports unreadable content instead of zero reminders: %s', (value) => {
    expect(inspectEmailTk('TK', value).contentError).toBe(true);
  });
  it('accepts empty drafts', () => {
    expect(inspectEmailTk('', '')).toEqual({ subject: false, body: false, contentError: false });
  });
});
