import { fireEvent, render, screen } from '@testing-library/react';
import { type HTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ShadeApp from '../../../src/shade-app';
import { useRowPress } from '../../../src/hooks/use-row-press';

function Row({ enabled = true, ...props }: HTMLAttributes<HTMLDivElement> & { enabled?: boolean }) {
  const press = useRowPress(props, enabled);
  return <div data-testid="row" {...props} {...press} />;
}

function pointer(type: string, values: Record<string, unknown> = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerType: 'touch',
    isPrimary: true,
    pointerId: 1,
    clientX: 20,
    clientY: 20,
    ...values,
  });
  fireEvent(screen.getByTestId('row'), event);
  return event;
}

describe('useRowPress', () => {
  it.each(['pointerup', 'pointercancel', 'pointerout'])('clears touch feedback on %s', (event) => {
    render(<Row />);
    pointer('pointerdown');
    expect(screen.getByTestId('row').getAttribute('data-row-pressed')).toBe('true');
    pointer(event);
    expect(screen.getByTestId('row').hasAttribute('data-row-pressed')).toBe(false);
  });

  it('clears feedback when a touch starts scrolling, without blocking the gesture', () => {
    const onPointerMove = vi.fn();
    render(<Row onPointerMove={onPointerMove} />);
    const down = pointer('pointerdown');
    pointer('pointermove', { clientY: 24 });
    expect(screen.getByTestId('row').getAttribute('data-row-pressed')).toBe('true');
    const move = pointer('pointermove', { clientY: 35 });
    expect(screen.getByTestId('row').hasAttribute('data-row-pressed')).toBe(false);
    expect(down.defaultPrevented).toBe(false);
    expect(move.defaultPrevented).toBe(false);
    expect(onPointerMove).toHaveBeenCalledTimes(2);
  });

  it('preserves a consumer preventing a press', () => {
    const onPointerDown = vi.fn((event) => event.preventDefault());
    render(<Row onPointerDown={onPointerDown} />);
    pointer('pointerdown');
    expect(onPointerDown).toHaveBeenCalledOnce();
    expect(screen.getByTestId('row').hasAttribute('data-row-pressed')).toBe(false);
  });

  it('leaves mouse feedback to CSS', () => {
    render(<Row />);
    pointer('pointerdown', { pointerType: 'mouse' });
    expect(screen.getByTestId('row').hasAttribute('data-row-pressed')).toBe(false);
  });

  it('keeps static rows free of press feedback while preserving their handlers', () => {
    const onPointerDown = vi.fn();
    render(<Row enabled={false} onPointerDown={onPointerDown} />);
    pointer('pointerdown');
    expect(onPointerDown).toHaveBeenCalledOnce();
    expect(screen.getByTestId('row').hasAttribute('data-row-pressed')).toBe(false);
  });
});

it.each([false, true])('provides touch feedback with admin7Design=%s', (flag) => {
  const onPointerDown = vi.fn();
  render(
    <ShadeApp admin7Design={flag} darkMode={false}>
      <Row onPointerDown={onPointerDown} />
    </ShadeApp>,
  );
  pointer('pointerdown');
  expect(onPointerDown).toHaveBeenCalledOnce();
  expect(screen.getByTestId('row').getAttribute('data-row-pressed')).toBe('true');
});

it('keeps the initiating finger pressed when a second finger moves or releases', () => {
  const onPointerUp = vi.fn();
  render(<Row onPointerUp={onPointerUp} />);
  pointer('pointerdown');
  pointer('pointerdown', { pointerId: 2, isPrimary: false });
  pointer('pointermove', { pointerId: 2, clientY: 50 });
  pointer('pointerup', { pointerId: 2 });
  expect(screen.getByTestId('row').getAttribute('data-row-pressed')).toBe('true');
  expect(onPointerUp).toHaveBeenCalledOnce();
  pointer('pointerup');
  expect(screen.getByTestId('row').hasAttribute('data-row-pressed')).toBe(false);
});

it('clears a press when interactivity is removed and restored', () => {
  const { rerender } = render(<Row />);
  pointer('pointerdown');
  rerender(<Row enabled={false} />);
  rerender(<Row enabled />);
  expect(screen.getByTestId('row').hasAttribute('data-row-pressed')).toBe(false);
});
