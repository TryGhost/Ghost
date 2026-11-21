/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import getReadingTime from '../../../src/utils/get-reading-time';

describe('getReadingTime', () => {
  it.each(['</p><p>', '<br>', '<br />', '&nbsp;'])('counts words separated by %s', (separator) => {
    const content = `<p>${Array(276).fill('word').join(separator)}</p>`;
    expect(getReadingTime(content)).toBe('2 min read');
  });

  it('does not split words at inline formatting boundaries', () => {
    const content = Array(275).fill('<strong>pub</strong>lishing').join(' ');
    expect(getReadingTime(content)).toBe('1 min read');
  });

  it('does not count script and style contents as article text', () => {
    const hidden = Array(276).fill('word').join(' ');
    expect(getReadingTime(`<style>${hidden}</style><script>${hidden}</script><p>Article</p>`)).toBe(
      '1 min read',
    );
  });

  it('handles empty content', () => {
    expect(getReadingTime('')).toBe('0 min read');
  });
});
