import { describe, expect, it } from 'vitest';
import { EMAIL_SIZE_LIMIT_BYTES, estimateEmailSize } from './email-size';

const SITE_URL = 'https://example.com';
// Each tracked link is rewritten to the site URL plus a 50-character path.
const REWRITTEN_LENGTH = SITE_URL.length + 50;

function content(body: string): string {
  return `<html><!-- POST CONTENT START -->${body}<!-- POST CONTENT END --></html>`;
}

function bytes(html: string): number {
  return new Blob([html]).size;
}

function padded(totalBytes: number, body = ''): string {
  const html = content(body);
  return content(`${body}${'a'.repeat(totalBytes - bytes(html))}`);
}

describe('estimateEmailSize', () => {
  it('measures the rendered HTML in bytes, not characters', () => {
    const html = content('é'.repeat(1024));

    expect(estimateEmailSize(html, SITE_URL).sizeKb).toBe(Math.round(bytes(html) / 1024));
    expect(bytes(html)).toBeGreaterThan(html.length);
  });

  it('is over the limit from exactly 100kB', () => {
    expect(estimateEmailSize(padded(EMAIL_SIZE_LIMIT_BYTES - 1), SITE_URL)).toEqual({
      overLimit: false,
      sizeKb: 100,
    });
    expect(estimateEmailSize(padded(EMAIL_SIZE_LIMIT_BYTES), SITE_URL)).toEqual({
      overLimit: true,
      sizeKb: 100,
    });
  });

  it('rounds to the nearest kilobyte', () => {
    expect(estimateEmailSize(padded(1535), SITE_URL).sizeKb).toBe(1);
    expect(estimateEmailSize(padded(1536), SITE_URL).sizeKb).toBe(2);
  });

  it('counts each content link at its rewritten length', () => {
    const links = [
      'https://ghost.org/',
      'http://ghost.org/a-much-longer-link-than-the-rewritten-one-would-ever-be-in-a-sent-email',
      '/relative/',
    ];
    const html = content(links.map((url) => `<a href="${url}">x</a>`).join(''));
    const adjustment = links.reduce((sum, url) => sum + REWRITTEN_LENGTH - url.length, 0);

    expect(estimateEmailSize(html, SITE_URL).sizeKb).toBe(
      Math.round((bytes(html) + adjustment) / 1024),
    );
  });

  it('lets link rewriting alone push an email over the limit', () => {
    const link = '<a href="/">x</a>';
    const linkCount = 200;
    const growth = linkCount * (REWRITTEN_LENGTH - 1);
    const html = padded(EMAIL_SIZE_LIMIT_BYTES - growth, link.repeat(linkCount));

    expect(estimateEmailSize(html, SITE_URL).overLimit).toBe(true);
    expect(estimateEmailSize(html.replaceAll(link, ''), SITE_URL).overLimit).toBe(false);
  });

  it('leaves replacement tokens, anchors and other schemes as they are', () => {
    const links = [
      '<a href="%%{unsubscribe_url}%%">x</a>',
      '<a href="#">x</a>',
      '<a href="mailto:hello@example.com">x</a>',
      '<a href="#section">x</a>',
    ].join('');

    expect(estimateEmailSize(padded(2048, links), SITE_URL).sizeKb).toBe(2);
  });

  it('ignores links outside the post content markers', () => {
    const outside =
      '<a href="https://example.com/unsubscribe-from-a-long-link-in-the-footer/">x</a>';
    const html = `<html>${outside}<!-- POST CONTENT START -->${'a'.repeat(2000)}<!-- POST CONTENT END -->${outside}</html>`;

    expect(estimateEmailSize(html, 'https://a-very-long-site-url.example.com').sizeKb).toBe(
      Math.round(bytes(html) / 1024),
    );
  });

  it('counts every link when the markers are missing', () => {
    const html = `<a href="https://ghost.org/">x</a>${'a'.repeat(1000)}`;

    expect(estimateEmailSize(html, SITE_URL).sizeKb).toBe(
      Math.round((bytes(html) + REWRITTEN_LENGTH - 'https://ghost.org/'.length) / 1024),
    );
  });

  it('measures the site URL without its trailing slash', () => {
    const html = content(`<a href="/">x</a>`.repeat(100));

    expect(estimateEmailSize(html, `${SITE_URL}/`)).toEqual(estimateEmailSize(html, SITE_URL));
  });

  it('never estimates below zero bytes', () => {
    const longLink = `https://ghost.org/${'x'.repeat(4000)}`;

    expect(estimateEmailSize(`<a href="${longLink}">`, SITE_URL)).toEqual({
      overLimit: false,
      sizeKb: 0,
    });
  });
});
