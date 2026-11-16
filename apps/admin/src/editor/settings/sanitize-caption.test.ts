import { describe, expect, it } from 'vitest';
import { sanitizeCaption } from './sanitize-caption';

describe('sanitizeCaption', () => {
  it('keeps links and inline formatting', () => {
    const caption =
      '<b><strong>Bold</strong></b> <u>underline</u> <s>struck</s> <code>code</code> <mark>marked</mark> H<sub>2</sub>O x<sup>2</sup><br>Photo by <a href="https://example.com">Jo</a>';

    expect(sanitizeCaption(caption)).toBe(caption);
  });

  it('removes other elements, attributes and unsafe links', () => {
    expect(
      sanitizeCaption(
        'By <a href="javascript:alert(1)" onclick="alert(1)" data-x="1">Jo</a><img src=x onerror=alert(1)><script>alert(1)</script><p>Text</p>',
      ),
    ).toBe('By <a>Jo</a>Text');
  });

  it('treats a missing caption as empty', () => {
    expect(sanitizeCaption(null)).toBe('');
  });
});
