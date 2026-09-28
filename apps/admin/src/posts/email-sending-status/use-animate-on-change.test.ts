import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnimateOnChange } from './use-animate-on-change';

describe('useAnimateOnChange', () => {
  it('does not animate the first render', () => {
    const { result } = renderHook(() => useAnimateOnChange('sending'));

    expect(result.current).toBe(false);
  });

  it('animates once the value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useAnimateOnChange(value), {
      initialProps: { value: 'sending' },
    });

    rerender({ value: 'sent' });

    expect(result.current).toBe(true);
  });

  it('ignores changes while the value is still loading in', () => {
    const { result, rerender } = renderHook(
      ({ value, ready }) => useAnimateOnChange(value, ready),
      { initialProps: { value: 'published-and-sent', ready: false } },
    );

    rerender({ value: 'published', ready: true });
    expect(result.current).toBe(false);

    rerender({ value: 'published-and-sent', ready: true });
    expect(result.current).toBe(true);
  });
});
