import { describe, expect, it } from 'vitest';
import { extractHelpLinks, renderInline, renderMarkdown, trimOpenLink } from './help-markdown';

describe('renderInline', () => {
  it('renders bold, italic, code and links', () => {
    expect(
      renderInline('Go to **Settings** and *save* `now`, see [guide](https://ghost.org/help/x/).'),
    ).toBe(
      'Go to <strong>Settings</strong> and <em>save</em> <code>now</code>, see <a href="https://ghost.org/help/x/">guide</a>.',
    );
  });

  it('leaves asterisks inside code spans and words alone', () => {
    expect(renderInline('`a * b` and snake_case_name')).toBe(
      '<code>a * b</code> and snake_case_name',
    );
  });
});

describe('renderMarkdown', () => {
  it('renders paragraphs, headings and lists', () => {
    const html = renderMarkdown(
      ['First line', 'same paragraph.', '', '## Steps', '1. One', '2. Two', '', '- A', '- B'].join(
        '\n',
      ),
    );
    expect(html).toBe(
      '<p>First line same paragraph.</p><h3>Steps</h3><ol><li>One</li><li>Two</li></ol><ul><li>A</li><li>B</li></ul>',
    );
  });

  it('starts a list straight after a paragraph', () => {
    expect(renderMarkdown('Do this:\n- A\n- B')).toBe(
      '<p>Do this:</p><ul><li>A</li><li>B</li></ul>',
    );
  });

  it('keeps code blocks as they are and escapes HTML', () => {
    expect(renderMarkdown('```\n<b>x</b> **y**\n```')).toBe(
      '<pre><code>&lt;b&gt;x&lt;/b&gt; **y**</code></pre>',
    );
    expect(renderMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
  });
});

describe('extractHelpLinks', () => {
  it('drops lines that are only help article links and keeps their urls', () => {
    const { markdown, urls } = extractHelpLinks(
      'Open **Publish**.\n\n[Publishing and scheduling](https://ghost.org/help/publishing-content/).',
    );
    expect(markdown).toBe('Open **Publish**.');
    expect(urls).toEqual(['https://ghost.org/help/publishing-content/']);
  });

  it('unlinks a help article inside a sentence and leaves other links alone', () => {
    const { markdown, urls } = extractHelpLinks(
      'See the [Stripe guide](https://ghost.org/help/stripe/) and [Stripe](https://stripe.com/docs).',
    );
    expect(markdown).toBe('See the Stripe guide and [Stripe](https://stripe.com/docs).');
    expect(urls).toEqual(['https://ghost.org/help/stripe/']);
  });

  it('lists each url once', () => {
    const { urls } = extractHelpLinks(
      '[A](https://ghost.org/help/stripe/)\n- [B](https://ghost.org/help/stripe/)',
    );
    expect(urls).toEqual(['https://ghost.org/help/stripe/']);
  });
});

describe('trimOpenLink', () => {
  it('removes a link still being streamed', () => {
    expect(trimOpenLink('Done. [Publishing and sch')).toBe('Done. ');
    expect(trimOpenLink('Done. [Publishing](https://ghost.org/he')).toBe('Done. ');
    expect(trimOpenLink('Done. [Publishing](https://ghost.org/help/x/)')).toBe(
      'Done. [Publishing](https://ghost.org/help/x/)',
    );
  });
});
