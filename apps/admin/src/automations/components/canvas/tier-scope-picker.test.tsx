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
        options={TIERS}
        placeholder="Select tiers..."
        standalone={{ value: 'any_paid', label: 'Any paid tier' }}
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
  it('lists the standalone option first, then the tiers in their own group', () => {
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
    expect(screen.queryByText('Specific tiers')).not.toBeInTheDocument();
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

  it('retains missing selections when adding a tier without offering them as options', () => {
    render(<Picker initial={['missing']} />);
    expect(screen.getByRole('button', { name: 'Remove Unavailable tier' })).toBeVisible();
    open();
    expect(screen.queryByRole('option', { name: 'Unavailable tier' })).not.toBeInTheDocument();

    fireEvent.click(option('Gold'));
    expect(value()).toEqual(['gold', 'missing']);
    expect(screen.getByRole('button', { name: 'Remove Unavailable tier' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Unavailable tier' }));
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

  it('resets the highlight when typing and after clearing a committed search', () => {
    render(<Picker />);
    open();
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.change(field(), { target: { value: 'gol' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(value()).toEqual(['gold']);
    expect(field()).toHaveValue('');
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(value()).toBe('any_paid');
  });

  it('shows a notice in place of the rows', () => {
    render(
      <TierScopePicker<'any_paid'>
        emptyMessage="No tiers found"
        inputLabel="From"
        notice={<p>Loading tiers...</p>}
        options={TIERS}
        placeholder="Select tiers..."
        standalone={{ value: 'any_paid', label: 'Any paid tier' }}
        value={[]}
        onChange={vi.fn()}
      />,
    );
    open();

    expect(screen.getByText('Loading tiers...')).toBeVisible();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});

const LABELS = [
  { id: 'free-trial', name: 'Free trial' },
  { id: 'vip', name: 'VIP' },
];

function SinglePicker({
  initial = [],
  onCreate = vi.fn(),
  onSearchChange,
  onEndReached,
}: {
  initial?: string[];
  onCreate?: (term: string) => void;
  onSearchChange?: (search: string) => void;
  onEndReached?: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>(initial);
  return (
    <>
      <TierScopePicker<never>
        createRow={{
          offer: (term) =>
            term !== '' && !LABELS.some((label) => label.name.toLowerCase() === term.toLowerCase()),
          label: (term) => `Create "${term}"`,
          onCreate,
        }}
        emptyMessage="No labels found"
        inputLabel="Label"
        options={LABELS}
        placeholder="Search or create a label..."
        value={chosen}
        single
        onChange={(next) => setChosen(typeof next === 'string' ? [] : next)}
        onEndReached={onEndReached}
        onSearchChange={onSearchChange}
      />
      <output data-testid="value">{JSON.stringify(chosen)}</output>
    </>
  );
}

const labelField = () => screen.getByRole('combobox', { name: 'Label' });
const openLabels = () => fireEvent.click(labelField());

describe('TierScopePicker with one choice', () => {
  it('shows the chosen option as the field text, and replaces it on picking another', () => {
    render(<SinglePicker />);
    expect(labelField()).toHaveValue('');
    expect(labelField()).toHaveAttribute('placeholder', 'Search or create a label...');

    openLabels();
    fireEvent.click(option('VIP'));
    expect(value()).toEqual(['vip']);
    expect(labelField()).toHaveValue('VIP');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    openLabels();
    fireEvent.click(option('Free trial'));
    expect(value()).toEqual(['free-trial']);
    expect(labelField()).toHaveValue('Free trial');
  });

  it('selects the chosen text on click, so typing replaces it', () => {
    render(<SinglePicker initial={['vip']} />);
    openLabels();

    expect(labelField()).toHaveProperty('selectionStart', 0);
    expect(labelField()).toHaveProperty('selectionEnd', 3);
  });

  it('searches over the chosen text, and puts it back on leaving without a pick', () => {
    render(<SinglePicker initial={['vip']} />);
    openLabels();
    fireEvent.change(labelField(), { target: { value: 'fr' } });

    expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual([
      'Free trial',
      'Create "fr"',
    ]);

    fireEvent.keyDown(labelField(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(labelField()).toHaveValue('VIP');
    expect(value()).toEqual(['vip']);
  });

  it('clears the choice on Backspace and lists every option', () => {
    render(<SinglePicker initial={['vip']} />);
    fireEvent.keyDown(labelField(), { key: 'Backspace' });

    expect(value()).toEqual([]);
    expect(labelField()).toHaveValue('');
    expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual([
      'Free trial',
      'VIP',
    ]);
  });

  it('offers to create what is typed in place of the empty message', () => {
    const onCreate = vi.fn();
    render(<SinglePicker onCreate={onCreate} />);
    openLabels();
    fireEvent.change(labelField(), { target: { value: 'Lead magnet' } });

    expect(screen.queryByText('No labels found')).not.toBeInTheDocument();
    fireEvent.click(option('Create "Lead magnet"'));

    expect(onCreate).toHaveBeenCalledWith('Lead magnet');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('reports the typed search and asks for more rows at the end of the list', () => {
    const onSearchChange = vi.fn();
    const onEndReached = vi.fn();
    render(<SinglePicker onEndReached={onEndReached} onSearchChange={onSearchChange} />);
    openLabels();
    fireEvent.change(labelField(), { target: { value: 'vi' } });
    expect(onSearchChange).toHaveBeenLastCalledWith('vi');

    fireEvent.scroll(screen.getByRole('listbox').parentElement as HTMLElement);
    expect(onEndReached).toHaveBeenCalled();
  });
});
