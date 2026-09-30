import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChangeCount } from './use-change-count';

describe('useChangeCount', () => {
  it('does not animate the first render', () => {
    const { result } = renderHook(() => useChangeCount('sending'));

    expect(result.current).toBe(0);
  });

  it('animates once the value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useChangeCount(value), {
      initialProps: { value: 'sending' },
    });

    rerender({ value: 'sent' });

    expect(result.current).toBe(1);
  });

  it('gives every later change a new key', () => {
    const { result, rerender } = renderHook(({ value }) => useChangeCount(value), {
      initialProps: { value: 'preparing' },
    });

    rerender({ value: 'submitting' });
    rerender({ value: 'submitting' });
    expect(result.current).toBe(1);

    rerender({ value: 'failed' });
    expect(result.current).toBe(2);
  });

  it('ignores changes while the value is still loading in', () => {
    const { result, rerender } = renderHook(({ value, ready }) => useChangeCount(value, ready), {
      initialProps: { value: 'published-and-sent', ready: false },
    });

    rerender({ value: 'published', ready: true });
    expect(result.current).toBe(0);

    rerender({ value: 'published-and-sent', ready: true });
    expect(result.current).toBe(1);
  });
});
