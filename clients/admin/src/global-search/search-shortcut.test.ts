import { describe, expect, it } from 'vitest';
import { isSearchShortcut } from './search-shortcut';

const keydown = (init: KeyboardEventInit) => new KeyboardEvent('keydown', { key: 'k', ...init });

describe('isSearchShortcut', () => {
  it('matches Cmd+K on a Mac and Ctrl+K elsewhere', () => {
    expect(isSearchShortcut(keydown({ metaKey: true }), true)).toBe(true);
    expect(isSearchShortcut(keydown({ ctrlKey: true }), false)).toBe(true);
  });

  it("ignores the other platform's modifier", () => {
    expect(isSearchShortcut(keydown({ ctrlKey: true }), true)).toBe(false);
    expect(isSearchShortcut(keydown({ metaKey: true }), false)).toBe(false);
  });

  it.each([
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['both command keys', { ctrlKey: true }],
  ])('ignores an extra %s modifier', (_name, extra) => {
    expect(isSearchShortcut(keydown({ metaKey: true, ...extra }), true)).toBe(false);
  });

  it('ignores other keys and a bare K', () => {
    expect(isSearchShortcut(keydown({ key: 'j', metaKey: true }), true)).toBe(false);
    expect(isSearchShortcut(keydown({}), true)).toBe(false);
  });

  it('matches the K key on layouts where it types a non-Latin character', () => {
    expect(isSearchShortcut(keydown({ key: 'л', code: 'KeyK', metaKey: true }), true)).toBe(true);
  });

  it('follows the typed letter on Latin layouts that move K', () => {
    expect(isSearchShortcut(keydown({ key: 'e', code: 'KeyK', metaKey: true }), true)).toBe(false);
    expect(isSearchShortcut(keydown({ key: 'k', code: 'KeyN', metaKey: true }), true)).toBe(true);
  });

  it('ignores keydown events without a key, as autofill sends', () => {
    const autofill = new Event('keydown') as KeyboardEvent;

    expect(isSearchShortcut(autofill, true)).toBe(false);
    expect(
      isSearchShortcut(
        Object.assign(new Event('keydown'), { metaKey: true }) as KeyboardEvent,
        true,
      ),
    ).toBe(false);
  });

  it('ignores keys pressed while composing text', () => {
    expect(isSearchShortcut(keydown({ metaKey: true, isComposing: true }), true)).toBe(false);
  });
});
