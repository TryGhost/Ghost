// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PinToggle } from './pin-toggle';

const labels = { pinLabel: 'Pin it', unpinLabel: 'Unpin it' };

describe('PinToggle', () => {
  it('labels itself for what clicking does', () => {
    const { rerender } = render(<PinToggle {...labels} pinned={false} onPinnedChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Pin it' })).toBeTruthy();

    rerender(<PinToggle {...labels} pinned={true} onPinnedChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Unpin it' })).toBeTruthy();
  });

  it('asks for the opposite state when clicked', () => {
    const onPinnedChange = vi.fn();
    render(<PinToggle {...labels} pinned={true} onPinnedChange={onPinnedChange} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onPinnedChange).toHaveBeenCalledWith(false);
  });

  it('tilts the pin while pinned', () => {
    render(<PinToggle {...labels} pinned={true} onPinnedChange={vi.fn()} />);

    expect(screen.getByRole('button').querySelector('svg')?.style.transform).toBe('rotate(45deg)');
  });

  it('stays focusable but does nothing with aria-disabled', () => {
    const onPinnedChange = vi.fn();
    render(<PinToggle {...labels} pinned={false} aria-disabled onPinnedChange={onPinnedChange} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    expect(onPinnedChange).not.toHaveBeenCalled();
    expect(button.hasAttribute('disabled')).toBe(false);
  });
});
