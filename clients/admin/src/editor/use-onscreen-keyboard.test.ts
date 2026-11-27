import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOnscreenKeyboard } from './use-onscreen-keyboard';

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setupViewport() {
  const viewport = Object.assign(new EventTarget(), { height: 800, scale: 1 });
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('innerHeight', 800);
  const resize = (height: number, scale = 1) => {
    act(() => {
      Object.assign(viewport, { height, scale });
      viewport.dispatchEvent(new Event('resize'));
    });
  };
  return { viewport, resize };
}

function focusTextarea() {
  const textarea = document.createElement('textarea');
  document.body.append(textarea);
  act(() => textarea.focus());
  return textarea;
}

describe('useOnscreenKeyboard', () => {
  it('tracks a keyboard opening and closing while the title stays focused', () => {
    const { resize } = setupViewport();
    const { result } = renderHook(useOnscreenKeyboard);
    focusTextarea();
    expect(result.current).toBe(false);

    resize(480);
    expect(result.current).toBe(true);

    resize(800);
    expect(result.current).toBe(false);
  });

  it('recognizes contenteditable body focus when the viewport is already reduced', () => {
    const { resize } = setupViewport();
    const { result } = renderHook(useOnscreenKeyboard);
    resize(480);
    expect(result.current).toBe(false);

    const editor = document.createElement('div');
    editor.tabIndex = 0;
    // jsdom does not implement isContentEditable.
    Object.defineProperty(editor, 'isContentEditable', { value: true });
    document.body.append(editor);
    act(() => editor.focus());
    expect(result.current).toBe(true);

    act(() => editor.blur());
    expect(result.current).toBe(false);
  });

  it('does not mistake browser chrome or pinch zoom for a keyboard', () => {
    const { resize } = setupViewport();
    const { result } = renderHook(useOnscreenKeyboard);
    focusTextarea();

    resize(720);
    expect(result.current).toBe(false);

    resize(400, 2);
    expect(result.current).toBe(false);
  });

  it('does not hide the count for a focused non-text control or readonly field', () => {
    const { resize } = setupViewport();
    const { result } = renderHook(useOnscreenKeyboard);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    document.body.append(checkbox);
    act(() => checkbox.focus());
    resize(480);
    expect(result.current).toBe(false);

    const textarea = document.createElement('textarea');
    textarea.readOnly = true;
    document.body.append(textarea);
    act(() => textarea.focus());
    expect(result.current).toBe(false);
  });

  it('keeps the count visible when the visual viewport API is unavailable', () => {
    vi.stubGlobal('visualViewport', undefined);
    const { result } = renderHook(useOnscreenKeyboard);
    focusTextarea();
    expect(result.current).toBe(false);
  });

  it('removes viewport and focus listeners when the editor unmounts', () => {
    const { viewport } = setupViewport();
    const removeViewportListener = vi.spyOn(viewport, 'removeEventListener');
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(useOnscreenKeyboard);
    unmount();

    expect(removeViewportListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeDocumentListener).toHaveBeenCalledWith('focusin', expect.any(Function));
    expect(removeDocumentListener).toHaveBeenCalledWith('focusout', expect.any(Function));
  });
});
