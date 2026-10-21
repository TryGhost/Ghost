import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TierScopePicker } from './tier-scope-picker';

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

const TIERS = [
  { id: 'bronze', name: 'Bronze' },
  { id: 'silver', name: 'Silver' },
  { id: 'gold', name: 'Gold' },
];

function Picker({ initial = [] }: { initial?: 'any_paid' | string[] }) {
  const [value, setValue] = useState<'any_paid' | string[]>(initial);
  return (
    <>
      <TierScopePicker<'any_paid'>
        emptyMessage="No tiers found"
        inputLabel="From"
        placeholder="Select tiers..."
        standalone={{ value: 'any_paid', label: 'Any paid tier' }}
        tiers={TIERS}
        value={value}
        onChange={setValue}
      />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const field = () => screen.getByRole('combobox', { name: 'From' });
const value = (): unknown => JSON.parse(screen.getByTestId('value').textContent ?? '');
const open = () => fireEvent.click(field());
const option = (name: string) => screen.getByRole('option', { name });

describe('TierScopePicker', () => {
  it('lists the standalone option first, then the tiers under their heading', () => {
    render(<Picker />);
    expect(field()).toHaveAttribute('placeholder', 'Select tiers...');
    open();

    const listbox = screen.getByRole('listbox', { name: 'From' });
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((row) => row.textContent),
    ).toEqual(['Any paid tier', 'Bronze', 'Silver', 'Gold']);
    expect(
      within(screen.getByRole('group', { name: 'Specific tiers' }))
        .getAllByRole('option')
        .map((row) => row.textContent),
    ).toEqual(['Bronze', 'Silver', 'Gold']);
  });

  it('shows the standalone option as the plain value, and closes the list on choosing it', () => {
    render(<Picker />);
    open();
    fireEvent.click(option('Any paid tier'));

    expect(value()).toBe('any_paid');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByText('Any paid tier')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Remove Any paid tier' })).not.toBeInTheDocument();
    expect(field()).toHaveAttribute('placeholder', '');
  });

  it('replaces the standalone option with a tier, and tiers with the standalone option', () => {
    render(<Picker initial="any_paid" />);
    open();
    fireEvent.click(option('Gold'));
    expect(value()).toEqual(['gold']);
    expect(screen.getByRole('button', { name: 'Remove Gold' })).toBeVisible();

    fireEvent.click(option('Any paid tier'));
    expect(value()).toBe('any_paid');
    expect(screen.queryByRole('button', { name: 'Remove Gold' })).not.toBeInTheDocument();
  });

  it('keeps tiers in their listed order and stays open while picking them', () => {
    render(<Picker />);
    open();
    fireEvent.click(option('Gold'));
    fireEvent.click(option('Bronze'));

    expect(value()).toEqual(['bronze', 'gold']);
    expect(screen.getByRole('listbox')).toBeVisible();
    expect(option('Gold')).toHaveAttribute('aria-selected', 'true');
    expect(option('Silver')).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(option('Gold'));
    expect(value()).toEqual(['bronze']);
  });

  it('removes a tier from its chip', () => {
    render(<Picker initial={['bronze', 'gold']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Bronze' }));

    expect(value()).toEqual(['gold']);
  });

  it('clears the last choice on Backspace with nothing typed', () => {
    render(<Picker initial={['bronze', 'gold']} />);
    fireEvent.keyDown(field(), { key: 'Backspace' });
    expect(value()).toEqual(['bronze']);

    cleanup();
    render(<Picker initial="any_paid" />);
    fireEvent.keyDown(field(), { key: 'Backspace' });
    expect(value()).toEqual([]);
  });

  it('narrows the list by what is typed', () => {
    render(<Picker />);
    fireEvent.change(field(), { target: { value: 'gol' } });

    expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual(['Gold']);

    fireEvent.change(field(), { target: { value: 'platinum' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No tiers found')).toBeVisible();
  });

  it('walks every row with the keyboard', () => {
    render(<Picker />);
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeVisible();

    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.keyDown(field(), { key: 'Enter' });

    expect(value()).toEqual(['silver']);

    fireEvent.keyDown(field(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('consumes Escape only while its list is open', () => {
    const onEscape = vi.fn();
    window.addEventListener('keydown', onEscape);
    try {
      render(<Picker />);
      open();
      fireEvent.keyDown(field(), { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(onEscape).not.toHaveBeenCalled();

      fireEvent.keyDown(field(), { key: 'Escape' });
      expect(onEscape).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('keydown', onEscape);
    }
  });

  it('shows a notice in place of the rows', () => {
    render(
      <TierScopePicker<'any_paid'>
        emptyMessage="No tiers found"
        inputLabel="From"
        notice={<p>Loading tiers...</p>}
        placeholder="Select tiers..."
        standalone={{ value: 'any_paid', label: 'Any paid tier' }}
        tiers={TIERS}
        value={[]}
        onChange={vi.fn()}
      />,
    );
    open();

    expect(screen.getByText('Loading tiers...')).toBeVisible();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
