import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSettingsSidebar } from './use-settings-sidebar';

const STORAGE_KEY = 'ghost-editor-settings-sidebar';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useSettingsSidebar', () => {
  it('starts closed with nothing remembered', () => {
    const { result } = renderHook(() => useSettingsSidebar());

    expect(result.current.isOpen).toBe(false);
  });

  it('opens from a remembered preference', () => {
    localStorage.setItem(STORAGE_KEY, 'open');

    const { result } = renderHook(() => useSettingsSidebar());

    expect(result.current.isOpen).toBe(true);
  });

  it('remembers each toggle', () => {
    const { result } = renderHook(() => useSettingsSidebar());

    act(() => result.current.toggle());

    expect(result.current.isOpen).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('open');

    act(() => result.current.toggle());

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('closed');
  });

  it('stays usable when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const { result } = renderHook(() => useSettingsSidebar());

    expect(result.current.isOpen).toBe(false);

    act(() => result.current.toggle());

    expect(result.current.isOpen).toBe(true);
  });
});
