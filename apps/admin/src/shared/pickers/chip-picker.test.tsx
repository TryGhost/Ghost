import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChipPicker } from './chip-picker';
import { ShadeApp } from '@tryghost/shade/app';

interface Option {
  id: string;
  name: string;
}

it.each(['current', 'legacy'] as const)(
  'inherits %s chip styling and preserves removal',
  (design) => {
    const onRemove = vi.fn();
    const alpha = { id: 'alpha', name: 'Alpha' };
    render(
      <ShadeApp darkMode={false} design={design}>
        <ChipPicker<Option, Option>
          emptyMessage="No options found"
          getKey={(option) => option.id}
          getLabel={(option) => option.name}
          inputLabel="Options"
          options={[alpha]}
          placeholder="Select options..."
          selected={[alpha]}
          onAdd={vi.fn()}
          onRemove={onRemove}
        />
      </ShadeApp>,
    );
    const chip = screen.getByRole('button', { name: 'Remove Alpha' });
    expect(chip).toHaveClass(design === 'legacy' ? 'rounded-xs' : 'rounded-full');
    fireEvent.click(chip);
    expect(onRemove).toHaveBeenCalledWith('alpha');
  },
);

const scrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  if (scrollIntoView) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', scrollIntoView);
  } else {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  }
});

/** The settings sidebar's pane, reduced to the Escape listener it dismisses on. */
function Pane() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) {
    return <p>Pane closed</p>;
  }

  return (
    <ChipPicker<Option, Option>
      emptyMessage="No options found"
      getKey={(option) => option.id}
      getLabel={(option) => option.name}
      inputLabel="Options"
      options={[{ id: 'alpha', name: 'Alpha' }]}
      placeholder="Select options..."
      selected={[]}
      onAdd={vi.fn()}
      onRemove={vi.fn()}
    />
  );
}

describe('ChipPicker Escape', () => {
  it('closes the list without dismissing the pane around it', () => {
    render(<Pane />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeVisible();

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Pane closed')).not.toBeInTheDocument();
  });
});
