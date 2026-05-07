import {useMemo, useState} from 'react';
import {act, fireEvent, render, screen, waitFor} from '../../utils/test-utils';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {createFilter, Filter, FilterFieldConfig, Filters, ValueSource} from '../../../../src/components/features/filters/filters';

type TestOption = {
    value: string;
    label: string;
};

const ALL_OPTIONS: TestOption[] = [
    {value: 'published', label: 'Published'},
    {value: 'draft', label: 'Draft'}
];

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
});

describe('Filters allowMultiple multiselect', () => {
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

    function MultiselectTestFilters({initialFilters, onChangeSpy}: Readonly<{
        initialFilters: Filter<string>[];
        // eslint-disable-next-line no-unused-vars
        onChangeSpy: (filters: Filter<string>[]) => void;
    }>) {
        const [filters, setFilters] = useState<Filter<string>[]>(initialFilters);
        const fields = useMemo<FilterFieldConfig<string>[]>(() => ([
            {
                key: 'label',
                label: 'Label',
                type: 'multiselect',
                searchable: false,
                operators: [{value: 'is-any', label: 'is any of'}],
                defaultOperator: 'is-any',
                options: [
                    {value: 'vip', label: 'VIP'},
                    {value: 'premium', label: 'Premium'},
                    {value: 'gold', label: 'Gold'}
                ]
            }
        ]), []);

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

        fireEvent.click(screen.getByRole('button', {name: 'Add filter'}));

        const labelMenuItem = await screen.findByRole('option', {name: 'Label'});
        fireEvent.click(labelMenuItem);

        const premiumOption = await screen.findByRole('option', {name: 'Premium'});
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
        expect(screen.queryByRole('option', {name: 'Gold'})).toBeNull();
    });
});
