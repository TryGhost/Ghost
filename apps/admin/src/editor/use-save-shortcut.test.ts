import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSaveShortcut } from './use-save-shortcut';

function pressSave(key = 's', modifiers: Partial<KeyboardEventInit> = { metaKey: true }) {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers });
  document.dispatchEvent(event);
  return event;
}

function focusedTextInput(onBlur: () => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.addEventListener('blur', onBlur);
  document.body.append(input);
  input.focus();
  return input;
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve);
    });
  });
}

describe('useSaveShortcut', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('saves on Cmd-S and on Ctrl-S, replacing the browser save dialog', async () => {
    const onSave = vi.fn();
    renderHook(() => useSaveShortcut(onSave));

    expect(pressSave().defaultPrevented).toBe(true);
    expect(pressSave('S', { ctrlKey: true }).defaultPrevented).toBe(true);
    await flush();

    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('commits the focused text input before the save reads the post', async () => {
    const order: string[] = [];
    renderHook(() => useSaveShortcut(() => order.push('save')));
    focusedTextInput(() => order.push('blur'));

    pressSave();
    await flush();

    expect(order).toEqual(['blur', 'save']);
  });

  it('leaves other keys and unmodified presses to the page', async () => {
    const onSave = vi.fn();
    renderHook(() => useSaveShortcut(onSave));

    expect(pressSave('s', {}).defaultPrevented).toBe(false);
    expect(pressSave('a').defaultPrevented).toBe(false);
    expect(pressSave('s', { metaKey: true, altKey: true }).defaultPrevented).toBe(false);
    await flush();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves once for a held key, not once per repeat', async () => {
    const onSave = vi.fn();
    renderHook(() => useSaveShortcut(onSave));

    pressSave();
    expect(pressSave('s', { metaKey: true, repeat: true }).defaultPrevented).toBe(true);
    pressSave('s', { metaKey: true, repeat: true });
    await flush();

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('drops a save the editor unmounted before', async () => {
    const onSave = vi.fn();
    const { unmount } = renderHook(() => useSaveShortcut(onSave));

    pressSave();
    unmount();
    await flush();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('stops listening once the editor unmounts', async () => {
    const onSave = vi.fn();
    const { unmount } = renderHook(() => useSaveShortcut(onSave));

    unmount();
    pressSave();
    await flush();

    expect(onSave).not.toHaveBeenCalled();
  });
});
