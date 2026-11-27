import { isSearchShortcut } from '../../src/app';

const press = (key: string, modifiers: { metaKey?: boolean; ctrlKey?: boolean } = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  ...modifiers,
});

describe('search shortcut', () => {
  test('is Cmd+K on macOS, leaving Ctrl+K to the text field', () => {
    expect(isSearchShortcut(press('k', { metaKey: true }), true)).toBe(true);
    expect(isSearchShortcut(press('k', { ctrlKey: true }), true)).toBe(false);
  });

  test('is Ctrl+K or Meta+K elsewhere', () => {
    expect(isSearchShortcut(press('k', { ctrlKey: true }), false)).toBe(true);
    expect(isSearchShortcut(press('k', { metaKey: true }), false)).toBe(true);
  });

  test('needs both the modifier and K', () => {
    expect(isSearchShortcut(press('k'), false)).toBe(false);
    expect(isSearchShortcut(press('j', { ctrlKey: true }), false)).toBe(false);
  });
});
