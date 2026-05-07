import {useMemo, useState} from 'react';
import {act, fireEvent, render, screen, waitFor} from '../../utils/test-utils';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {createFilter, FilterFieldConfig, Filters, ValueSource} from '../../../../src/components/features/filters/filters';

vi.mock('@/components/ui/calendar', () => ({
    Calendar: ({selected, onSelect}: {selected?: Date; onSelect?: unknown}) => {
        const handleSelect = () => {
            if (typeof onSelect === 'function') {
                onSelect(new Date(2026, 4, 8));
            }
        };

        return (
            <div>
                <div
                    data-selected={selected ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}` : ''}
                    data-testid="calendar-selected"
                />
                <button type="button" onClick={handleSelect}>Select May 8</button>
            </div>
        );
    }
}));

type TestOption = {
    value: string;
    label: string;
};

const ALL_OPTIONS: TestOption[] = [
    {value: 'published', label: 'Published'},
    {value: 'draft', label: 'Draft'}
];

interface DateFiltersProps {
    initialValue?: string;
    onFiltersChange: ReturnType<typeof vi.fn>;
    onInputChange: ReturnType<typeof vi.fn>;
}

function TestFilters({valueSource}: Readonly<{valueSource: ValueSource<string>}>) {
    const [filters, setFilters] = useState([createFilter('status', 'is', ['published'])]);
    const fields = useMemo(() => ([
        {
            key: 'status',
            label: 'Status',
            type: 'select' as const,
            searchable: true,
            operators: [{value: 'is', label: 'is'}],
            valueSource
        }
    ]), [valueSource]);

    return <Filters fields={fields} filters={filters} showSearchInput={false} onChange={setFilters} />;
}

function StaticLoadingFilters({isLoading, options}: Readonly<{isLoading: boolean; options: TestOption[]}>) {
    const [filters, setFilters] = useState([createFilter<string>('status', 'is', [])]);
    const fields = useMemo<FilterFieldConfig<string>[]>(() => ([
        {
            key: 'status',
            label: 'Status',
            type: 'select' as const,
            searchable: true,
            operators: [{value: 'is', label: 'is'}],
            options,
            isLoading
        }
    ]), [isLoading, options]);

    return <Filters<string> fields={fields} filters={filters} showSearchInput={false} onChange={setFilters} />;
}

function DateFilters({
    initialValue = '2026-05-07',
    onFiltersChange,
    onInputChange
}: Readonly<DateFiltersProps>) {
    const [filters, setFilters] = useState([createFilter<string>('created_at', 'is', [initialValue])]);
    const fields = useMemo<FilterFieldConfig<string>[]>(() => ([
        {
            key: 'created_at',
            label: 'Date',
            type: 'date' as const,
            operators: [{value: 'is', label: 'is'}],
            onInputChange: event => onInputChange(event.target.value)
        }
    ]), [onInputChange]);

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
    return screen.getByRole('button', {name: 'Published'});
}

function openSelectedValuePopover() {
    fireEvent.click(getSelectedValueTrigger());
}

function createMatchingValueSource() {
    const useOptions = vi.fn(({query, selectedValues}: {query: string; selectedValues: string[]}) => ({
        options: ALL_OPTIONS.filter((option) => {
            return option.label.toLowerCase().includes(query.toLowerCase()) ||
                selectedValues.includes(option.value);
        }),
        isInitialLoad: false,
        isSearching: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: () => {}
    }));

    return {id: 'status', useOptions};
}

function openCalendar() {
    fireEvent.click(screen.getByRole('button', {name: 'Open calendar'}));
}

describe('Filters ValueSource', () => {
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
        const {useOptions} = valueSource;

        render(<TestFilters valueSource={valueSource} />);

        expect(useOptions).toHaveBeenCalledWith({
            query: '',
            selectedValues: ['published']
        });

        openSelectedValuePopover();

        const input = await screen.findByPlaceholderText('Search status...');
        fireEvent.change(input, {target: {value: 'dra'}});

        await waitFor(() => {
            expect(useOptions).toHaveBeenLastCalledWith({
                query: 'dra',
                selectedValues: ['published']
            });
        });
    });

    it('keeps the selected option out of the options list when the current query excludes it', async () => {
        const useOptions = vi.fn(({query}: {query: string; selectedValues: string[]}) => ({
            options: query
                ? ALL_OPTIONS.filter(option => option.value === 'draft')
                : ALL_OPTIONS,
            isInitialLoad: false,
            isSearching: false,
            isLoadingMore: false,
            hasMore: false,
            loadMore: () => {}
        }));

        render(<TestFilters valueSource={{id: 'status', useOptions}} />);

        openSelectedValuePopover();

        const input = await screen.findByPlaceholderText('Search status...');
        fireEvent.change(input, {target: {value: 'dra'}});

        await waitFor(() => {
            expect(screen.getAllByText('Published')).toHaveLength(1);
            expect(screen.getByText('Draft')).toBeDefined();
        });
    });

    it('resets the local query and visible options when the popover closes', async () => {
        const valueSource = createMatchingValueSource();
        const {useOptions} = valueSource;

        render(<TestFilters valueSource={valueSource} />);

        openSelectedValuePopover();

        const input = await screen.findByPlaceholderText('Search status...');
        fireEvent.change(input, {target: {value: 'dra'}});

        await waitFor(() => {
            expect(useOptions).toHaveBeenLastCalledWith({
                query: 'dra',
                selectedValues: ['published']
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
            selectedValues: ['published']
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
            loadMore
        }));

        render(<TestFilters valueSource={{id: 'status', useOptions}} />);

        openSelectedValuePopover();

        const loadMoreButton = await screen.findByRole('button', {name: 'Load more'});
        fireEvent.click(loadMoreButton);

        expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it('shows loading states for static select fields', async () => {
        const {rerender} = render(<StaticLoadingFilters isLoading={true} options={[]} />);

        fireEvent.click(screen.getByRole('button', {name: 'Select...'}));
        expect(await screen.findByText('Loading...')).toBeDefined();

        rerender(<StaticLoadingFilters isLoading={true} options={ALL_OPTIONS} />);
        expect(await screen.findByPlaceholderText('Search status...')).toBeDefined();
        expect(document.querySelector('.animate-spin')).toBeTruthy();
    });

    it('calls date field onInputChange when a typed date is committed', () => {
        const handleFiltersChange = vi.fn();
        const handleInputChange = vi.fn();

        render(<DateFilters onFiltersChange={handleFiltersChange} onInputChange={handleInputChange} />);

        const input = screen.getByDisplayValue('2026-05-07');
        fireEvent.change(input, {target: {value: '2026-05-08'}});
        fireEvent.blur(input);

        expect(handleFiltersChange).toHaveBeenCalledWith('2026-05-08');
        expect(handleInputChange).toHaveBeenCalledWith('2026-05-08');
    });

    it('resets manually entered invalid date values to today', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 9));
        const handleFiltersChange = vi.fn();
        const handleInputChange = vi.fn();

        render(<DateFilters onFiltersChange={handleFiltersChange} onInputChange={handleInputChange} />);

        const input = screen.getByDisplayValue('2026-05-07');
        fireEvent.change(input, {target: {value: '2026-02-30'}});
        fireEvent.blur(input);

        expect(screen.getByDisplayValue('2026-05-09')).toBeDefined();
        expect(handleFiltersChange).toHaveBeenCalledWith('2026-05-09');
        expect(handleInputChange).toHaveBeenCalledWith('2026-05-09');
    });

    it('passes valid date values to the calendar selection', async () => {
        render(<DateFilters onFiltersChange={vi.fn()} onInputChange={vi.fn()} />);

        openCalendar();

        expect((await screen.findByTestId('calendar-selected')).getAttribute('data-selected')).toBe('2026-05-07');
    });

    it('updates the date input when a calendar date is selected', async () => {
        const handleFiltersChange = vi.fn();
        const handleInputChange = vi.fn();

        render(<DateFilters onFiltersChange={handleFiltersChange} onInputChange={handleInputChange} />);

        openCalendar();
        fireEvent.click(await screen.findByRole('button', {name: 'Select May 8'}));

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
        render(<DateFilters initialValue="2026-02-30" onFiltersChange={vi.fn()} onInputChange={vi.fn()} />);

        openCalendar();

        expect((await screen.findByTestId('calendar-selected')).getAttribute('data-selected')).toBe('');
    });

    it('requires date values to use the HTML date input format', async () => {
        render(<DateFilters initialValue="2026-5-7" onFiltersChange={vi.fn()} onInputChange={vi.fn()} />);

        openCalendar();

        expect((await screen.findByTestId('calendar-selected')).getAttribute('data-selected')).toBe('');
    });
});
