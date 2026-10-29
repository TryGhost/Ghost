import { describe, expect, it } from 'vitest';
import { editorFontToSave, isEditorFont } from './editor-font';

describe('isEditorFont', () => {
  it('accepts the three fonts and nothing else', () => {
    expect(['serif', 'sans', 'mono'].every(isEditorFont)).toBe(true);
    // The picker's group reports an empty value when its chosen item is pressed again.
    expect(isEditorFont('')).toBe(false);
    expect(isEditorFont('cursive')).toBe(false);
  });
});

describe('editorFontToSave', () => {
  it('sends nothing before the writer chooses', () => {
    expect(editorFontToSave({ chosen: null, saved: 'mono', pending: null })).toBeNull();
  });

  it('sends a choice that differs from the saved font', () => {
    expect(editorFontToSave({ chosen: 'mono', saved: undefined, pending: null })).toBe('mono');
    expect(editorFontToSave({ chosen: 'serif', saved: 'sans', pending: null })).toBe('serif');
  });

  it('sends nothing for the saved font, counting serif as saved until one is', () => {
    expect(editorFontToSave({ chosen: 'sans', saved: 'sans', pending: null })).toBeNull();
    expect(editorFontToSave({ chosen: 'serif', saved: undefined, pending: null })).toBeNull();
  });

  it('measures a choice against a save still on its way rather than the saved font', () => {
    // Mono is on its way; going back to serif must follow it, or mono lands last.
    expect(editorFontToSave({ chosen: 'serif', saved: undefined, pending: 'mono' })).toBe('serif');
    expect(editorFontToSave({ chosen: 'mono', saved: undefined, pending: 'mono' })).toBeNull();
  });
});
