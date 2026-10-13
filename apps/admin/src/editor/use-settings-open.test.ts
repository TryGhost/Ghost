import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS_OPEN_KEY } from './settings-open';
import { useSettingsOpen } from './use-settings-open';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A screen as wide as `width`, answering the overlay query the hook asks. */
function setupScreen(width: number) {
  const listeners = new Set<() => void>();
  const screen = { width };
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      const max = Number(/width < (\d+)px/.exec(query)?.[1]);
      return screen.width < max;
    },
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }));
  const resize = (next: number) => {
    act(() => {
      screen.width = next;
      listeners.forEach((listener) => listener());
    });
  };
  return { resize };
}

const stored = () => localStorage.getItem(SETTINGS_OPEN_KEY);

describe('useSettingsOpen', () => {
  it('opens in place with the editor when the writer left the panel open', () => {
    setupScreen(1280);
    localStorage.setItem(SETTINGS_OPEN_KEY, 'open');
    const { result } = renderHook(() => useSettingsOpen(true));

    expect(result.current.openAtStart).toBe(true);
    expect(result.current.restored).toBe(true);
  });

  it('remembers each toggle, and the first ends the restored panel', () => {
    setupScreen(1280);
    localStorage.setItem(SETTINGS_OPEN_KEY, 'open');
    const { result } = renderHook(() => useSettingsOpen(true));

    act(() => result.current.toggled(false));
    expect(stored()).toBe('closed');
    expect(result.current.restored).toBe(false);

    act(() => result.current.toggled(true));
    expect(stored()).toBe('open');
    expect(result.current.restored).toBe(false);
  });

  it('starts closed and forgets toggles where the panel covers the editor', () => {
    const { resize } = setupScreen(900);
    localStorage.setItem(SETTINGS_OPEN_KEY, 'open');
    const { result } = renderHook(() => useSettingsOpen(true));

    expect(result.current.openAtStart).toBe(false);
    act(() => result.current.toggled(false));
    expect(stored()).toBe('open');

    // Widened, the panel sits beside the editor again and its toggles count.
    resize(1280);
    act(() => result.current.toggled(true));
    expect(stored()).toBe('open');
    act(() => result.current.toggled(false));
    expect(stored()).toBe('closed');
  });

  it('decides the start once, as the editor opens', () => {
    const { resize } = setupScreen(900);
    localStorage.setItem(SETTINGS_OPEN_KEY, 'open');
    const { result, rerender } = renderHook(({ enabled }) => useSettingsOpen(enabled), {
      initialProps: { enabled: false },
    });

    resize(1280);
    rerender({ enabled: true });

    expect(result.current.openAtStart).toBe(false);
    expect(result.current.restored).toBe(false);
  });

  it('reads and writes nothing with the flag off', () => {
    setupScreen(1280);
    localStorage.setItem(SETTINGS_OPEN_KEY, 'open');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const { result } = renderHook(() => useSettingsOpen(false));

    expect(result.current.openAtStart).toBe(false);
    act(() => result.current.toggled(false));

    expect(getItem).not.toHaveBeenCalled();
    expect(stored()).toBe('open');
  });
});
