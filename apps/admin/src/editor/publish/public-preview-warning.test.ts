import { describe, expect, it } from 'vitest';
import { getPublicPreviewWarning } from '@/editor/publish/public-preview-warning';

function lexical(children: unknown[]): string {
  return JSON.stringify({ root: { children } });
}

const paragraph = (text: string) => ({
  type: 'paragraph',
  children: [{ type: 'text', text }],
});
const paywall = { type: 'paywall' };

describe('getPublicPreviewWarning', () => {
  it('returns nothing without a paywall card', () => {
    expect(
      getPublicPreviewWarning({ lexical: lexical([paragraph('Hello')]), visibility: 'paid' }),
    ).toBeNull();
  });

  it('warns that a public post ignores the preview', () => {
    expect(
      getPublicPreviewWarning({
        lexical: lexical([paragraph('Above'), paywall, paragraph('Below')]),
        visibility: 'public',
      }),
    ).toBe('public-access');
  });

  it('warns when nothing sits above the paywall', () => {
    expect(
      getPublicPreviewWarning({
        lexical: lexical([paywall, paragraph('Below')]),
        visibility: 'paid',
      }),
    ).toBe('no-content-before');
  });

  it('warns when nothing sits below the paywall', () => {
    expect(
      getPublicPreviewWarning({
        lexical: lexical([paragraph('Above'), paywall, paragraph('   ')]),
        visibility: 'members',
      }),
    ).toBe('no-content-after');
  });

  it('counts a card as content but an empty paragraph as nothing', () => {
    expect(
      getPublicPreviewWarning({
        lexical: lexical([{ type: 'image' }, paywall, paragraph('Below')]),
        visibility: 'paid',
      }),
    ).toBeNull();
  });

  it('is silent on unparseable or absent content', () => {
    expect(getPublicPreviewWarning({ lexical: 'not json', visibility: 'paid' })).toBeNull();
    expect(getPublicPreviewWarning({ lexical: null, visibility: 'paid' })).toBeNull();
  });
});
