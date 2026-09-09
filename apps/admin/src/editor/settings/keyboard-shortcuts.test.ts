import { describe, expect, it } from 'vitest';
import { keyboardShortcutGroups, type Shortcut, type ShortcutGroup } from './keyboard-shortcuts';

function find(groups: ShortcutGroup[], label: string): Shortcut {
  const shortcut = groups.flatMap((group) => group.shortcuts).find((row) => row.label === label);
  if (!shortcut) {
    throw new Error(`No shortcut labelled ${label}`);
  }
  return shortcut;
}

function keys(groups: ShortcutGroup[], label: string): string[] {
  return find(groups, label).keys.map((token) => token.text);
}

describe('keyboardShortcutGroups', () => {
  const mac = keyboardShortcutGroups(true);
  const windows = keyboardShortcutGroups(false);

  it('lists every group in order', () => {
    expect(mac.map((group) => group.title)).toEqual([
      'Formatting',
      'Editing',
      'Application',
      'Inserting',
    ]);
    expect(mac.map((group) => group.shortcuts.length)).toEqual([12, 7, 3, 28]);
  });

  it('shows Mac writers the Mac glyphs', () => {
    expect(keys(mac, 'Bold')).toEqual(['⌘', 'B']);
    expect(keys(mac, 'Strike through')).toEqual(['⌃', '⌥', 'U']);
    expect(keys(mac, 'Highlight')).toEqual(['⌘', '⌥', 'H']);
    expect(keys(mac, 'Inline code')).toEqual(['⌃', '⇧', 'K']);
    expect(keys(mac, 'Toggle card edit mode')).toEqual(['⌘', '↩']);
    expect(keys(mac, 'Publish')).toEqual(['⌘', '⇧', 'P']);
  });

  it('shows everyone else the key names', () => {
    expect(keys(windows, 'Bold')).toEqual(['Ctrl', 'B']);
    expect(keys(windows, 'Strike through')).toEqual(['Ctrl', 'Alt', 'U']);
    expect(keys(windows, 'Highlight')).toEqual(['Ctrl', 'Alt', 'H']);
    expect(keys(windows, 'Inline code')).toEqual(['Ctrl', 'Shift', 'K']);
    expect(keys(windows, 'Toggle card edit mode')).toEqual(['Ctrl', 'Enter']);
    expect(keys(windows, 'Publish')).toEqual(['Ctrl', 'Shift', 'P']);
    expect(keys(windows, 'Line break')).toEqual(['Shift', 'Enter']);
    expect(keys(windows, 'Code block')).toEqual(['```', 'Enter']);
  });

  it('names the modifier a glyph stands for, and only where it is a glyph', () => {
    const macCommand = find(mac, 'Bold').keys[0];
    expect(macCommand).toEqual({ text: '⌘', tooltip: 'Command' });
    expect(find(mac, 'Strike through').keys[0].tooltip).toBe('Control');
    expect(find(mac, 'Strike through').keys[1].tooltip).toBe('Option');
    expect(find(mac, 'Inline code').keys[1].tooltip).toBe('Shift');
    expect(find(mac, 'Toggle card edit mode').keys[1].tooltip).toBe('Return');

    expect(find(windows, 'Bold').keys[0]).toEqual({ text: 'Ctrl', mono: true });
  });

  it('carries the slash commands unchanged on either platform', () => {
    expect(keys(mac, 'Image')).toEqual(['/image']);
    expect(keys(windows, 'Image')).toEqual(['/image']);
    expect(keys(mac, 'YouTube')).toEqual(['/youtube [url]']);
    expect(keys(mac, 'Code block')).toEqual(['```', '↩']);
  });

  it('joins the divider alternatives with a word that is not a key', () => {
    expect(find(mac, 'Divider').keys).toEqual([
      { text: '---', mono: true },
      { text: 'or', mono: true, plain: true },
      { text: '/hr', mono: true },
    ]);
  });

  it('shows the formatting labels as the formatting they produce', () => {
    expect(find(mac, 'Bold').style).toBe('bold');
    expect(find(mac, 'Emphasize').style).toBe('italic');
    expect(find(mac, 'Underline').style).toBe('underline');
    expect(find(mac, 'Strike through').style).toBe('strikethrough');
    expect(find(mac, 'Highlight').style).toBe('highlight');
    expect(find(mac, 'Link').style).toBe('link');
    expect(find(mac, 'Inline code').style).toBe('code');
    expect(find(mac, 'List').style).toBeUndefined();
  });
});
