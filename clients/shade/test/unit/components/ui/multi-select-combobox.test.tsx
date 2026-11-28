import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../utils/test-utils';
import { MultiSelectCombobox } from '../../../../src/components/ui/multi-select-combobox';

const OPTIONS = [
  { value: 'DE', label: 'Germany' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
];

function Picker() {
  const [values, setValues] = useState<string[]>([]);
  return <MultiSelectCombobox options={OPTIONS} values={values} onChange={setValues} />;
}

describe('MultiSelectCombobox', () => {
  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('keeps a picked option in view, at the top, while the search is still typed', async () => {
    render(<Picker />);

    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'united' } });
    expect(screen.queryByRole('option', { name: 'Germany' })).toBeNull();

    fireEvent.click(screen.getByRole('option', { name: 'United States' }));

    const names = await screen.findAllByRole('option');
    expect(names.map((option) => option.textContent)).toEqual(['United States', 'United Kingdom']);
  });
});
