import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChangeCount } from './use-change-count';

describe('useChangeCount', () => {
  it('starts at zero and increments only when the value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useChangeCount(value), {
      initialProps: { value: 'preparing' },
    });

    expect(result.current).toBe(0);

    rerender({ value: 'submitting' });
    expect(result.current).toBe(1);

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
