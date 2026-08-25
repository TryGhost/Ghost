import { useMemo, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '../../utils/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createFilter,
  Filter,
  FilterFieldConfig,
  Filters,
  ValueSource,
} from '../../../../src/components/patterns/filters';

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect }: { selected?: Date; onSelect?: unknown }) => {
    const handleSelect = () => {
      if (typeof onSelect === 'function') {
        onSelect(new Date(2026, 4, 8));
      }
    };

    return (
      <div>
        <div
          data-selected={
            selected
              ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`
              : ''
          }
          data-testid="calendar-selected"
        />
        <button type="button" onClick={handleSelect}>
          Select May 8
        </button>
      </div>
    );
  },
}));

type TestOption = {
  value: string;
  label: string;
};

const ALL_OPTIONS: TestOption[] = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

interface DateFiltersProps {
  initialValue?: string;
  onFiltersChange: ReturnType<typeof vi.fn<(value: string) => void>>;
  onInputChange: ReturnType<typeof vi.fn<(value: string) => void>>;
}

function TestFilters({ valueSource }: Readonly<{ valueSource: ValueSource<string> }>) {
  const [filters, setFilters] = useState([createFilter('status', 'is', ['published'])]);
  const fields = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        searchable: true,
        operators: [{ value: 'is', label: 'is' }],
        valueSource,
      },
    ],
    [valueSource],
  );

  return (
    <Filters fields={fields} filters={filters} showSearchInput={false} onChange={setFilters} />
  );
}

function StaticLoadingFilters({
  isLoading,
  options,
}: Readonly<{ isLoading: boolean; options: TestOption[] }>) {
  const [filters, setFilters] = useState([createFilter<string>('status', 'is', [])]);
  const fields = useMemo<FilterFieldConfig<string>[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        searchable: true,
        operators: [{ value: 'is', label: 'is' }],
        options,
        isLoading,
      },
    ],
    [isLoading, options],
  );

  return (
    <Filters<string>
      fields={fields}
      filters={filters}
      showSearchInput={false}
      onChange={setFilters}
    />
  );
}

function DateFilters({
  initialValue = '2026-05-07',
  onFiltersChange,
  onInputChange,
}: Readonly<DateFiltersProps>) {
  const [filters, setFilters] = useState([
    createFilter<string>('created_at', 'is', [initialValue]),
  ]);
  const fields = useMemo<FilterFieldConfig<string>[]>(
    () => [
      {
        key: 'created_at',
        label: 'Date',
        type: 'date' as const,
        operators: [{ value: 'is', label: 'is' }],
        onInputChange: (event) => onInputChange(event.target.value),
      },
    ],
    [onInputChange],
  );

  return (
    <Filters<string>
      fields={fields}
      filters={filters}
      showSearchInput={false}
      onChange={(nextFilters) => {
        setFilters(nextFilters);
        onFiltersChange(String(nextFilters[0]?.values[0] || ''));
      }}
    />
  );
}

function getSelectedValueTrigger() {
  return screen.getByRole('button', { name: 'Published' });
}

function openSelectedValuePopover() {
  fireEvent.click(getSelectedValueTrigger());
}

function createMatchingValueSource() {
  const useOptions = vi.fn(
    ({ query, selectedValues }: { query: string; selectedValues: string[] }) => ({
      options: ALL_OPTIONS.filter((option) => {
        return (
          option.label.toLowerCase().includes(query.toLowerCase()) ||
          selectedValues.includes(option.value)
        );
      }),
      isInitialLoad: false,
      isSearching: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: () => {},
    }),
  );

  return { id: 'status', useOptions };
}

function openCalendar() {
  fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
}

describe('Filters', () => {
  describe('ValueSource', () => {
    beforeAll(() => {
      global.ResizeObserver = class {
        observe() {
          return undefined;
        }

        unobserve() {
          return undefined;
        }

        disconnect() {
          return undefined;
        }
      } as unknown as typeof ResizeObserver;
      HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calls the value source with local query state and selected values', async () => {
      const valueSource = createMatchingValueSource();
      const { useOptions } = valueSource;

      render(<TestFilters valueSource={valueSource} />);

      expect(useOptions).toHaveBeenCalledWith({
        query: '',
        selectedValues: ['published'],
      });

      openSelectedValuePopover();

      const input = await screen.findByPlaceholderText('Search status...');
      fireEvent.change(input, { target: { value: 'dra' } });

      await waitFor(() => {
        expect(useOptions).toHaveBeenLastCalledWith({
          query: 'dra',
          selectedValues: ['published'],
        });
      });
    });

    it('keeps the selected option out of the options list when the current query excludes it', async () => {
      const useOptions = vi.fn(({ query }: { query: string; selectedValues: string[] }) => ({
        options: query ? ALL_OPTIONS.filter((option) => option.value === 'draft') : ALL_OPTIONS,
        isInitialLoad: false,
        isSearching: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: () => {},
      }));

      render(<TestFilters valueSource={{ id: 'status', useOptions }} />);

      openSelectedValuePopover();

      const input = await screen.findByPlaceholderText('Search status...');
      fireEvent.change(input, { target: { value: 'dra' } });

      await waitFor(() => {
        expect(screen.getAllByText('Published')).toHaveLength(1);
        expect(screen.getByText('Draft')).toBeDefined();
      });
    });

    it('resets the local query and visible options when the popover closes', async () => {
      const valueSource = createMatchingValueSource();
      const { useOptions } = valueSource;

      render(<TestFilters valueSource={valueSource} />);

      openSelectedValuePopover();

      const input = await screen.findByPlaceholderText('Search status...');
      fireEvent.change(input, { target: { value: 'dra' } });

      await waitFor(() => {
        expect(useOptions).toHaveBeenLastCalledWith({
          query: 'dra',
          selectedValues: ['published'],
        });
      });

      const trigger = getSelectedValueTrigger();

      fireEvent.click(trigger);

      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 250);
        });
      });

      fireEvent.click(trigger);

      const reopenedInput = await screen.findByPlaceholderText('Search status...');
      expect((reopenedInput as HTMLInputElement).value).toBe('');
      expect(screen.getByText('Draft')).toBeDefined();
      expect(useOptions).toHaveBeenLastCalledWith({
        query: '',
        selectedValues: ['published'],
      });
    });

    it('renders and triggers load more when the value source supports pagination', async () => {
      const loadMore = vi.fn();
      const useOptions = vi.fn(() => ({
        options: ALL_OPTIONS,
        isInitialLoad: false,
        isSearching: false,
        isLoadingMore: false,
        hasMore: true,
        loadMore,
      }));

      render(<TestFilters valueSource={{ id: 'status', useOptions }} />);

      openSelectedValuePopover();

      const loadMoreButton = await screen.findByRole('button', { name: 'Load more' });
      fireEvent.click(loadMoreButton);

      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it('shows loading states for static select fields', async () => {
      const { rerender } = render(<StaticLoadingFilters isLoading={true} options={[]} />);

      fireEvent.click(screen.getByRole('button', { name: 'Select...' }));
      expect(await screen.findByText('Loading...')).toBeDefined();

      rerender(<StaticLoadingFilters isLoading={true} options={ALL_OPTIONS} />);
      expect(await screen.findByPlaceholderText('Search status...')).toBeDefined();
      expect(document.querySelector('.animate-spin')).toBeTruthy();
    });

    it('calls date field onInputChange when a typed date is committed', () => {
      const handleFiltersChange = vi.fn();
      const handleInputChange = vi.fn();

      render(
        <DateFilters onFiltersChange={handleFiltersChange} onInputChange={handleInputChange} />,
      );

      const input = screen.getByDisplayValue('2026-05-07');
      fireEvent.change(input, { target: { value: '2026-05-08' } });
      fireEvent.blur(input);

      expect(handleFiltersChange).toHaveBeenCalledWith('2026-05-08');
      expect(handleInputChange).toHaveBeenCalledWith('2026-05-08');
    });

    it('resets manually entered invalid date values to today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 9));
      const handleFiltersChange = vi.fn();
      const handleInputChange = vi.fn();

      render(
        <DateFilters onFiltersChange={handleFiltersChange} onInputChange={handleInputChange} />,
      );

      const input = screen.getByDisplayValue('2026-05-07');
      fireEvent.change(input, { target: { value: '2026-02-30' } });
      fireEvent.blur(input);

      expect(screen.getByDisplayValue('2026-05-09')).toBeDefined();
      expect(handleFiltersChange).toHaveBeenCalledWith('2026-05-09');
      expect(handleInputChange).toHaveBeenCalledWith('2026-05-09');
    });

    it('passes valid date values to the calendar selection', async () => {
      render(<DateFilters onFiltersChange={vi.fn()} onInputChange={vi.fn()} />);

      openCalendar();

      expect((await screen.findByTestId('calendar-selected')).getAttribute('data-selected')).toBe(
        '2026-05-07',
      );
    });

    it('updates the date input when a calendar date is selected', async () => {
      const handleFiltersChange = vi.fn();
      const handleInputChange = vi.fn();

      render(
        <DateFilters onFiltersChange={handleFiltersChange} onInputChange={handleInputChange} />,
      );

      openCalendar();
      fireEvent.click(await screen.findByRole('button', { name: 'Select May 8' }));

      expect(screen.getByDisplayValue('2026-05-08')).toBeDefined();
      expect(handleFiltersChange).toHaveBeenCalledWith('2026-05-08');
      expect(handleInputChange).toHaveBeenCalledWith('2026-05-08');
    });

    it('uses an editable text input for date values', () => {
      render(<DateFilters onFiltersChange={vi.fn()} onInputChange={vi.fn()} />);

      const input = screen.getByDisplayValue('2026-05-07') as HTMLInputElement;

      expect(input.type).toBe('text');
      expect(input.pattern).toBe('\\d{4}-\\d{2}-\\d{2}');
    });

    it('does not normalize overflow date values for the calendar selection', async () => {
      render(
        <DateFilters initialValue="2026-02-30" onFiltersChange={vi.fn()} onInputChange={vi.fn()} />,
      );

      openCalendar();

      expect((await screen.findByTestId('calendar-selected')).getAttribute('data-selected')).toBe(
        '',
      );
    });

    it('requires date values to use the HTML date input format', async () => {
      render(
        <DateFilters initialValue="2026-5-7" onFiltersChange={vi.fn()} onInputChange={vi.fn()} />,
      );

      openCalendar();

      expect((await screen.findByTestId('calendar-selected')).getAttribute('data-selected')).toBe(
        '',
      );
    });
  });

  describe('allowMultiple multiselect', () => {
    beforeAll(() => {
      global.ResizeObserver = class {
        observe() {
          return undefined;
        }

        unobserve() {
          return undefined;
        }

        disconnect() {
          return undefined;
        }
      } as unknown as typeof ResizeObserver;
      HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    function MultiselectTestFilters({
      initialFilters,
      onChangeSpy,
    }: Readonly<{
      initialFilters: Filter<string>[];
      onChangeSpy: (filters: Filter<string>[]) => void;
    }>) {
      const [filters, setFilters] = useState<Filter<string>[]>(initialFilters);
      const fields = useMemo<FilterFieldConfig<string>[]>(
        () => [
          {
            key: 'label',
            label: 'Label',
            type: 'multiselect',
            searchable: false,
            operators: [{ value: 'is-any', label: 'is any of' }],
            defaultOperator: 'is-any',
            options: [
              { value: 'vip', label: 'VIP' },
              { value: 'premium', label: 'Premium' },
              { value: 'gold', label: 'Gold' },
            ],
          },
        ],
        [],
      );

      return (
        <Filters
          addButtonText="Add filter"
          allowMultiple={true}
          fields={fields}
          filters={filters}
          showSearchInput={false}
          onChange={(next) => {
            onChangeSpy(next);
            setFilters(next);
          }}
        />
      );
    }

    it('commits a new single-value label filter and closes the picker after one selection', async () => {
      const onChangeSpy = vi.fn();
      const initial = [createFilter<string>('label', 'is-any', ['vip'])];

      render(<MultiselectTestFilters initialFilters={initial} onChangeSpy={onChangeSpy} />);

      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      const labelMenuItem = await screen.findByRole('option', { name: 'Label' });
      fireEvent.click(labelMenuItem);

      const premiumOption = await screen.findByRole('option', { name: 'Premium' });
      fireEvent.click(premiumOption);

      await waitFor(() => {
        const lastCall = onChangeSpy.mock.calls.at(-1);
        expect(lastCall).toBeDefined();
        const finalFilters = lastCall![0] as Filter<string>[];
        expect(finalFilters).toHaveLength(2);
        expect(finalFilters[0].field).toBe('label');
        expect(finalFilters[0].values).toEqual(['vip']);
        expect(finalFilters[1].field).toBe('label');
        expect(finalFilters[1].values).toEqual(['premium']);
      });

      // Picker should have closed — no more option role elements visible.
      expect(screen.queryByRole('option', { name: 'Gold' })).toBeNull();
    });
  });

  describe('group previewLimit', () => {
    const originalResizeObserver = global.ResizeObserver;
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

    beforeAll(() => {
      global.ResizeObserver = class {
        observe() {
          return undefined;
        }

        unobserve() {
          return undefined;
        }

        disconnect() {
          return undefined;
        }
      } as unknown as typeof ResizeObserver;
      HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    afterAll(() => {
      global.ResizeObserver = originalResizeObserver;
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    function PreviewLimitFilters({ previewLimit }: Readonly<{ previewLimit?: number }>) {
      const [filters, setFilters] = useState<Filter<string>[]>([]);
      const fields = useMemo(
        () => [
          {
            group: 'Custom fields',
            previewLimit,
            fields: Array.from({ length: 8 }, (_, index) => ({
              key: `custom_field.field_${index + 1}`,
              label: `Field ${index + 1}`,
              type: 'text' as const,
              operators: [{ value: 'is', label: 'is' }],
            })),
          },
        ],
        [previewLimit],
      );

      return (
        <Filters
          addButtonText="Add filter"
          allowMultiple={true}
          fields={fields}
          filters={filters}
          showSearchInput={true}
          onChange={setFilters}
        />
      );
    }

    it('previews only the first previewLimit fields behind a "Show more"', async () => {
      render(<PreviewLimitFilters previewLimit={5} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      expect(await screen.findByRole('option', { name: 'Field 5' })).toBeDefined();
      expect(screen.queryByRole('option', { name: 'Field 6' })).toBeNull();
      expect(screen.getByRole('option', { name: 'Show 3 more' })).toBeDefined();
    });

    it('reveals the rest of the group when "Show more" is clicked', async () => {
      render(<PreviewLimitFilters previewLimit={5} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      fireEvent.click(await screen.findByRole('option', { name: 'Show 3 more' }));

      expect(await screen.findByRole('option', { name: 'Field 8' })).toBeDefined();
      expect(screen.queryByRole('option', { name: /Show \d+ more/ })).toBeNull();
    });

    it('uncaps the group while searching so a capped-out field is findable by name', async () => {
      render(<PreviewLimitFilters previewLimit={5} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      const search = await screen.findByPlaceholderText('Search fields...');
      fireEvent.change(search, { target: { value: 'Field 8' } });

      expect(await screen.findByRole('option', { name: 'Field 8' })).toBeDefined();
      // "Show more" is a capping affordance, never part of a search result.
      expect(screen.queryByRole('option', { name: /Show \d+ more/ })).toBeNull();
    });

    it('shows every field when no previewLimit is set', async () => {
      render(<PreviewLimitFilters />);
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      expect(await screen.findByRole('option', { name: 'Field 8' })).toBeDefined();
      expect(screen.queryByRole('option', { name: /Show \d+ more/ })).toBeNull();
    });
  });

  describe('disabled fields and group empty state', () => {
    const originalResizeObserver = global.ResizeObserver;
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

    beforeAll(() => {
      global.ResizeObserver = class {
        observe() {
          return undefined;
        }

        unobserve() {
          return undefined;
        }

        disconnect() {
          return undefined;
        }
      } as unknown as typeof ResizeObserver;
      HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    afterAll(() => {
      global.ResizeObserver = originalResizeObserver;
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    function ReadOnlyFieldFilters() {
      const [filters, setFilters] = useState<Filter<string>[]>([
        createFilter('custom_field.archived', 'is', ['London']),
      ]);
      const fields = useMemo(
        () => [
          {
            group: 'Custom fields',
            fields: [
              {
                key: 'custom_field.archived',
                label: 'Archived field',
                type: 'text' as const,
                readOnly: true,
                operators: [{ value: 'is', label: 'is' }],
              },
            ],
          },
        ],
        [],
      );

      return (
        <Filters fields={fields} filters={filters} showSearchInput={true} onChange={setFilters} />
      );
    }

    function ReadOnlyPickerFilters() {
      const [filters, setFilters] = useState<Filter<string>[]>([
        createFilter('custom_field.archived', 'is', ['London']),
      ]);
      const fields = useMemo(
        () => [
          {
            group: 'Custom fields',
            fields: [
              {
                key: 'custom_field.archived',
                label: 'Archived field',
                type: 'text' as const,
                readOnly: true,
                operators: [{ value: 'is', label: 'is' }],
              },
              {
                key: 'custom_field.active',
                label: 'Active field',
                type: 'text' as const,
                operators: [{ value: 'is', label: 'is' }],
              },
            ],
          },
        ],
        [],
      );

      // allowMultiple is what a caller passes to let one field carry several filters.
      // It skips the applied-field de-dup, so it is the case where a read-only field
      // would otherwise reappear in the picker while its own pill is on screen.
      return (
        <Filters
          addButtonText="Add filter"
          allowMultiple={true}
          fields={fields}
          filters={filters}
          showSearchInput={true}
          onChange={setFilters}
        />
      );
    }

    it('never offers a read-only field in the picker, even where a field may repeat', () => {
      render(<ReadOnlyPickerFilters />);
      fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

      // The one that can be filtered on is offered...
      expect(screen.getByRole('option', { name: 'Active field' })).toBeDefined();
      // ...the read-only one is not: picking it would mint a second filter that could
      // never be edited. Its existing pill is still on screen.
      expect(screen.queryByRole('option', { name: 'Archived field' })).toBeNull();
    });

    function ReadOnlyOptionLabelFilters() {
      const [filters, setFilters] = useState<Filter<string>[]>([
        createFilter('tier', 'is', ['t1']),
      ]);
      const fields = useMemo(
        () => [
          {
            key: 'tier',
            label: 'Tier',
            type: 'select' as const,
            readOnly: true,
            operators: [{ value: 'is', label: 'is' }],
            options: [{ value: 't1', label: 'Gold' }],
          },
        ],
        [],
      );

      return <Filters fields={fields} filters={filters} onChange={setFilters} />;
    }

    it('reads a read-only value through its option label, as the editable one does', () => {
      render(<ReadOnlyOptionLabelFilters />);

      expect(screen.getByText('Gold')).toBeDefined();
      expect(screen.queryByText('t1')).toBeNull();
    });

    it('renders a read-only field showing its operator and value as static, non-editable text', () => {
      render(<ReadOnlyFieldFilters />);

      expect(screen.getByText('Archived field')).toBeDefined();
      // Operator and value stay visible so the filter reads clearly...
      expect(screen.getByText('is')).toBeDefined();
      expect(screen.getByText('London')).toBeDefined();
      // ...but there is nothing to edit: no input and no operator menu button.
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(screen.queryByRole('button', { name: 'is' })).toBeNull();
    });
  });
});
