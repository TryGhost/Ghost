import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChipPicker } from './chip-picker';

interface Option {
  id: string;
  name: string;
}

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

function Chips({
  onReorder,
  onRemove = vi.fn(),
  disabled,
}: {
  onReorder?: (next: Option[]) => void;
  onRemove?: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <ChipPicker<Option, Option>
      disabled={disabled}
      emptyMessage="No options found"
      getKey={(option) => option.id}
      getLabel={(option) => option.name}
      inputLabel="Options"
      options={[{ id: 'gamma', name: 'Gamma' }]}
      placeholder="Select options..."
      selected={[
        { id: 'alpha', name: 'Alpha' },
        { id: 'beta', name: 'Beta' },
      ]}
      onAdd={vi.fn()}
      onRemove={onRemove}
      onReorder={onReorder}
    />
  );
}

// A form holds its fields still while it saves, so a change can't slip in after what was sent.
describe('ChipPicker disabled', () => {
  it('opens no list and removes no chip', () => {
    const onRemove = vi.fn();
    render(<Chips disabled onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha' }));

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onRemove).not.toHaveBeenCalled();
  });
});

describe('ChipPicker reorder', () => {
  it('leaves the chips plain buttons without a reorder handler', () => {
    render(<Chips />);

    const chip = screen.getByRole('button', { name: 'Remove Alpha' });
    expect(chip).not.toHaveClass('touch-manipulation');
    expect(document.querySelector('[id^="DndLiveRegion"]')).toBeNull();
  });

  it('keeps each chip a remove button while it can be dragged', () => {
    render(<Chips onReorder={vi.fn()} />);

    const chip = screen.getByRole('button', { name: 'Remove Alpha' });
    expect(chip).not.toHaveAttribute('aria-roledescription');
    expect(chip).not.toHaveAttribute('aria-describedby');
    expect(chip).toHaveClass('touch-manipulation');
    expect(document.querySelector('[id^="DndLiveRegion"]')).not.toBeNull();
  });
});

describe('ChipPicker groups', () => {
  it('heads each run of rows with its group, and keeps the keyboard walking every row', () => {
    const onAdd = vi.fn();
    render(
      <ChipPicker<Option & { archived: boolean }, Option>
        emptyMessage="No options found"
        getGroup={(option) => (option.archived ? 'Archived' : 'Active')}
        getKey={(option) => option.id}
        getLabel={(option) => option.name}
        inputLabel="Options"
        options={[
          { id: 'gold', name: 'Gold', archived: false },
          { id: 'silver', name: 'Silver', archived: false },
          { id: 'bronze', name: 'Bronze', archived: true },
        ]}
        placeholder="Select options..."
        selected={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));

    const active = screen.getByRole('group', { name: 'Active' });
    const archived = screen.getByRole('group', { name: 'Archived' });
    expect(
      within(active)
        .getAllByRole('option')
        .map((row) => row.textContent),
    ).toEqual(['Gold', 'Silver']);
    expect(
      within(archived)
        .getAllByRole('option')
        .map((row) => row.textContent),
    ).toEqual(['Bronze']);

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

    expect(onAdd).toHaveBeenCalledWith({ id: 'bronze', name: 'Bronze', archived: true });
  });
});
