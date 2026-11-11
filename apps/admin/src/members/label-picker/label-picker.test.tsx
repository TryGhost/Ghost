import LabelPicker from '@/members/label-picker/label-picker';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComboboxOptionSource } from '@tryghost/shade/components';

// cmdk scrolls the selected item into view, which jsdom doesn't implement
Element.prototype.scrollIntoView = () => {};

const labels = [
  { id: '1', name: 'Newsletter', slug: 'newsletter' },
  { id: '2', name: 'VIP', slug: 'vip' },
];

const optionSource: ComboboxOptionSource<string> = {
  options: [],
  isInitialLoad: false,
  isSearching: false,
  isLoadingMore: false,
  hasMore: false,
  loadMore: vi.fn(),
  shouldClientFilter: true,
  onSearchChange: vi.fn(),
};

function renderAndSearch(searchText: string, selectedSlugs: string[] = []) {
  const onToggle = vi.fn();
  render(
    <LabelPicker
      labels={labels}
      optionSource={optionSource}
      selectedSlugs={selectedSlugs}
      onToggle={onToggle}
    />,
  );
  const input = screen.getByRole('combobox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: searchText } });
  return { input, onToggle };
}

describe('LabelPicker', () => {
  it('clears the search after clicking a suggestion', () => {
    const { input, onToggle } = renderAndSearch('News');

    fireEvent.click(screen.getByRole('option', { name: 'Newsletter' }));

    expect(onToggle).toHaveBeenCalledWith('newsletter');
    expect(input).toHaveValue('');
  });

  it('clears the search after choosing a suggestion with Enter', () => {
    const { input, onToggle } = renderAndSearch('News');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onToggle).toHaveBeenCalledWith('newsletter');
    expect(input).toHaveValue('');
  });

  it('points at an already-added label on Enter instead of removing it', () => {
    const { input, onToggle } = renderAndSearch('VIP', ['vip']);

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onToggle).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Remove VIP' })).toHaveAttribute('data-highlighted');
    expect(screen.getByText('VIP is already added')).toBeInTheDocument();
  });

  it('still removes an already-added label when its row is clicked', () => {
    const { onToggle } = renderAndSearch('VIP', ['vip']);

    fireEvent.click(screen.getByRole('option', { name: 'VIP' }));

    expect(onToggle).toHaveBeenCalledWith('vip');
  });
});
