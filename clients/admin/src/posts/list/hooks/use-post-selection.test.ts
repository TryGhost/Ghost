import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePostSelection } from './use-post-selection';

describe('usePostSelection', () => {
  it('ignores retargeted clicks and selection shortcuts while a bulk modal is open', () => {
    const { result, rerender } = renderHook(
      ({ suspended }) =>
        usePostSelection({
          orderedIds: ['first', 'second'],
          allFilter: 'status:draft',
          enabled: true,
          suspended,
        }),
      { initialProps: { suspended: false } },
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', metaKey: true }));
    });
    expect(result.current.filter).toBe('status:draft');

    rerender({ suspended: true });

    // A portaled dropdown can leave the eventual click targeted at the body,
    // so checking whether its target is inside the dialog is not sufficient.
    act(() => {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(result.current.isSelected('first')).toBe(true);
    expect(result.current.isSelected('second')).toBe(true);

    for (const event of [
      new KeyboardEvent('keydown', { key: 'Escape' }),
      new KeyboardEvent('keydown', { key: 'a', metaKey: true }),
    ]) {
      act(() => {
        window.dispatchEvent(event);
      });
      expect(result.current.filter).toBe('status:draft');
    }

    rerender({ suspended: false });
    act(() => {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(result.current.filter).toBe('id:nothing');
  });
});
