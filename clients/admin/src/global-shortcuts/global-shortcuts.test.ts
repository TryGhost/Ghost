import { describe, expect, it } from 'vitest';
import { globalShortcut } from './global-shortcuts';

const keydown = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

describe('globalShortcut', () => {
  it('matches Cmd on a Mac and Ctrl elsewhere', () => {
    expect(globalShortcut(keydown({ key: ',', metaKey: true }), true)).toBe('openSettings');
    expect(globalShortcut(keydown({ key: 's', metaKey: true }), true)).toBe('save');
    expect(globalShortcut(keydown({ key: ',', ctrlKey: true }), false)).toBe('openSettings');
    expect(globalShortcut(keydown({ key: 'S', ctrlKey: true }), false)).toBe('save');
  });

  it("ignores the other platform's modifier", () => {
    expect(globalShortcut(keydown({ key: 's', ctrlKey: true }), true)).toBeNull();
    expect(globalShortcut(keydown({ key: 's', metaKey: true }), false)).toBeNull();
  });

  it.each([
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['both command keys', { ctrlKey: true }],
  ])('ignores an extra %s modifier', (_name, extra) => {
    expect(globalShortcut(keydown({ key: 's', metaKey: true, ...extra }), true)).toBeNull();
  });

  it('ignores other keys and unmodified presses', () => {
    expect(globalShortcut(keydown({ key: 'k', metaKey: true }), true)).toBeNull();
    expect(globalShortcut(keydown({ key: 's' }), true)).toBeNull();
    expect(globalShortcut(keydown({ key: ',' }), true)).toBeNull();
  });

  it('matches the physical key on layouts where it types a non-ASCII character', () => {
    expect(globalShortcut(keydown({ key: 'ы', code: 'KeyS', metaKey: true }), true)).toBe('save');
    expect(globalShortcut(keydown({ key: 'б', code: 'Comma', metaKey: true }), true)).toBe(
      'openSettings',
    );
  });

  it('follows the typed character on layouts that move the key', () => {
    expect(globalShortcut(keydown({ key: ';', code: 'Comma', metaKey: true }), true)).toBeNull();
    expect(globalShortcut(keydown({ key: ',', code: 'KeyM', metaKey: true }), true)).toBe(
      'openSettings',
    );
    expect(globalShortcut(keydown({ key: 'o', code: 'KeyS', metaKey: true }), true)).toBeNull();
  });

  it('ignores keydown events without a key, as autofill sends', () => {
    expect(
      globalShortcut(Object.assign(new Event('keydown'), { metaKey: true }) as KeyboardEvent, true),
    ).toBeNull();
  });

  it('ignores keys pressed while composing text', () => {
    expect(
      globalShortcut(keydown({ key: 's', metaKey: true, isComposing: true }), true),
    ).toBeNull();
  });
});
