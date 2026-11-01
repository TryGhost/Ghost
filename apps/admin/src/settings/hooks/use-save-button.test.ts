import { act, renderHook } from '@testing-library/react';
import { useSaveButton } from './use-save-button';

describe('useSaveButton', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('returns to the idle state when a save is rejected', async () => {
    const save = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useSaveButton(save, true));
    await act(async () => result.current.onSaveClick());
    expect(save).toHaveBeenCalledWith({ fakeWhenUnchanged: true });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.savingTitle).toBe('Save');
  });

  it('keeps the first save active when the shortcut is invoked again', async () => {
    let release!: (value: boolean) => void;
    const pending = new Promise<boolean>((resolve) => {
      release = resolve;
    });
    const save = vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(false);
    const { result } = renderHook(() => useSaveButton(save));
    let first!: Promise<void>;
    act(() => {
      first = result.current.onSaveClick();
    });
    await act(async () => {
      await result.current.onSaveClick();
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(true);
    expect(result.current.savingTitle).toBe('Saving');
    await act(async () => {
      release(true);
      await first;
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.savingTitle).toBe('Save');
  });

  it('ignores the shortcut until saved feedback finishes', async () => {
    const save = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useSaveButton(save));
    await act(async () => result.current.onSaveClick());
    await act(async () => result.current.onSaveClick());
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await act(async () => result.current.onSaveClick());
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('restores the idle state and propagates a failed save', async () => {
    const error = new Error('Failed to save');
    const save = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useSaveButton(save));
    await act(async () => {
      await expect(result.current.onSaveClick()).rejects.toBe(error);
    });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.savingTitle).toBe('Save');
  });
});
