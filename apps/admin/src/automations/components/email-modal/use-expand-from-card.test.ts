import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExpandFromCard } from './use-expand-from-card';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = (card = document.createElement('article')) => {
  const panel = document.createElement('div');
  const content = document.createElement('div');
  const cancelCloseFade = vi.fn();
  panel.animate = () => ({ cancel: vi.fn() }) as unknown as Animation;
  content.animate = vi
    .fn()
    .mockReturnValueOnce({ cancel: vi.fn() })
    .mockReturnValueOnce({ cancel: cancelCloseFade });
  panel.append(content);
  const hook = renderHook(() => useExpandFromCard(() => card));
  act(() => hook.result.current.panelRef(panel));
  return { ...hook, card, cancelCloseFade };
};

describe('useExpandFromCard', () => {
  it('restores the card and finishes closing once after repeated close requests', () => {
    const { result, card, unmount } = setup();
    const done = vi.fn();
    expect(card.style.visibility).toBe('hidden');
    act(() => {
      result.current.close(done);
      result.current.close(done);
      vi.advanceTimersByTime(1000);
    });
    expect(card.style.visibility).toBe('');
    expect(done).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('cancels a closing animation on unmount without navigating afterward', () => {
    const card = document.createElement('article');
    card.style.visibility = 'inherit';
    const { result, cancelCloseFade, unmount } = setup(card);
    const done = vi.fn();
    act(() => result.current.close(done));
    expect(cancelCloseFade).not.toHaveBeenCalled();
    unmount();
    expect(cancelCloseFade).toHaveBeenCalledOnce();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(card.style.visibility).toBe('inherit');
    expect(done).not.toHaveBeenCalled();
  });
});
