import { describe, expect, it } from 'vitest';
import { isMacPlatform } from './is-mac-platform';

const MAC_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const WINDOWS_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

describe('isMacPlatform', () => {
  it('reads the platform off the user agent', () => {
    expect(isMacPlatform(MAC_AGENT)).toBe(true);
    expect(isMacPlatform(WINDOWS_AGENT)).toBe(false);
    expect(isMacPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe(false);
  });

  it('reads the live user agent when none is given', () => {
    expect(isMacPlatform()).toBe(navigator.userAgent.includes('Mac'));
  });
});
