import { describe, expect, it } from 'vitest';
import { ghostPicker } from './vite-front-door';

describe('ghostPicker', () => {
  it('takes turns without an X-Ghost-Target header', () => {
    const pick = ghostPicker();
    expect([pick(), pick(), pick()]).toEqual([1, 2, 1]);
  });

  it('sends a request to the Ghost its header names, without moving the turn on', () => {
    const pick = ghostPicker();
    expect([pick(), pick('2'), pick('2'), pick('1'), pick()]).toEqual([1, 2, 2, 1, 2]);
  });

  it('accepts no other header value', () => {
    const pick = ghostPicker();
    for (const target of ['3', '', 'ghost-1', ['1', '2']]) {
      expect(pick(target)).toBeUndefined();
    }
  });
});
