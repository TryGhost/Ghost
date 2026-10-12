import { describe, expect, it } from 'vitest';
import { isEditorFont, resolveEditorFont } from './editor-font';

describe('resolveEditorFont', () => {
  it("sets the editor in the writer's font while the flag is on", () => {
    expect(resolveEditorFont(true, 'sans')).toBe('sans');
    expect(resolveEditorFont(true, 'mono')).toBe('mono');
  });

  it('keeps the serif until the writer chooses', () => {
    expect(resolveEditorFont(true, undefined)).toBe('serif');
  });

  it('keeps the serif while the flag is off, whatever was saved', () => {
    expect(resolveEditorFont(false, 'mono')).toBe('serif');
    expect(resolveEditorFont(false, undefined)).toBe('serif');
  });
});

describe('isEditorFont', () => {
  it('accepts the three fonts and nothing else', () => {
    expect(['serif', 'sans', 'mono'].every(isEditorFont)).toBe(true);
    // The picker's group reports an empty value when its chosen item is pressed again.
    expect(isEditorFont('')).toBe(false);
    expect(isEditorFont('cursive')).toBe(false);
  });
});
