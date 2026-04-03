'use client';

import type React from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator
} from '@/components/ui/command';
import {Check, Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {FilterOption, ValueSource} from '@/components/ui/filters';

// --- Types ---

export interface MultiSelectComboboxI18n {
    searchPlaceholder: string;
    noResultsFound: string;
    loading: string;
    loadMore: string;
    selectedHeading?: string;
}

const DEFAULT_MULTI_SELECT_I18N: MultiSelectComboboxI18n = {
    searchPlaceholder: 'Search...',
    noResultsFound: 'No results found.',
    loading: 'Loading...',
    loadMore: 'Load more'
};

export interface RenderItemProps<T = unknown> {
    option: FilterOption<T>;
    isSelected: boolean;
    onSelect: () => void;
}

export interface HeaderRenderProps<T = unknown> {
    selectedOptions: FilterOption<T>[];
    onDeselect: (option: FilterOption<T>) => void;
}

export interface FooterRenderProps {
    searchInput: string;
    clearSearch: () => void;
}

export interface MultiSelectComboboxProps<T = unknown> {
    /** All available options (used for static/client-filtered mode) */
    options?: FilterOption<T>[];
    /** Currently selected values */
    values: T[];
    /** Called when selection changes */
    onChange: (values: T[]) => void;
    /** Async option source — when provided, options prop is ignored and search is server-side */
    valueSource?: ValueSource<string>;
    /** Whether the search input is shown (default true) */
    searchable?: boolean;
    /** Whether options are loading (static mode only) */
    isLoading?: boolean;
    /** Max number of selected values */
    maxSelections?: number;
    /** Whether this is a multiselect (default true) */
    isMultiSelect?: boolean;
    /** Auto-close callback — called when the combobox wants to close (e.g., single-select after picking) */
    onClose?: () => void;
    /** Whether to auto-close after each selection */
    autoCloseOnSelect?: boolean;
    /** CSS class applied to the outermost wrapper */
    className?: string;
    /** CSS class applied to the search input */
    searchInputClassName?: string;
    /** Whether cmdk should client-filter (default: true when no valueSource, false otherwise) */
    shouldFilter?: boolean;
    /** Called when search input changes (for external sync, e.g., server-side filtering) */
    onSearchChange?: (value: string) => void;
    /** i18n strings */
    i18n?: Partial<MultiSelectComboboxI18n>;
    /** Custom item renderer — replaces the default option row */
    renderItem?: (props: RenderItemProps<T>) => React.ReactNode;
    /** Render prop for content above the search input */
    header?: (props: HeaderRenderProps<T>) => React.ReactNode;
    /** Render prop for content below the option list */
    footer?: (props: FooterRenderProps) => React.ReactNode;
}

// --- Internal helpers ---

function filterOptionsBySearch<T = unknown>(options: FilterOption<T>[], search: string): FilterOption<T>[] {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
        return options;
    }
    return options.filter(opt => opt.label.toLowerCase().includes(normalized) ||
        opt.detail?.toLowerCase().includes(normalized));
}

// --- Hooks ---

interface ResolvedSourceState<T> {
    options: FilterOption<T>[];
    isInitialLoad: boolean;
    isSearching: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    loadMore: () => void;
    shouldClientFilter: boolean;
}

function useResolvedSource<T>(
    valueSource: ValueSource<string> | undefined,
    staticOptions: FilterOption<T>[] | undefined,
    searchInput: string,
    values: T[],
    isLoading: boolean,
    shouldFilterProp: boolean | undefined
): ResolvedSourceState<T> {
    const isAsync = Boolean(valueSource);
    const sourceState = valueSource?.useOptions({
        query: searchInput,
        selectedValues: values as string[]
    });
    const options = useMemo(() => (isAsync
        ? (sourceState?.options as FilterOption<T>[] | undefined) ?? []
        : staticOptions ?? []), [isAsync, sourceState?.options, staticOptions]);

    return {
        options,
        isInitialLoad: isAsync
            ? sourceState?.isInitialLoad ?? false
            : isLoading && (staticOptions?.length ?? 0) === 0,
        isSearching: isAsync
            ? sourceState?.isSearching ?? false
            : isLoading && (staticOptions?.length ?? 0) > 0,
        hasMore: isAsync ? sourceState?.hasMore ?? false : false,
        isLoadingMore: isAsync ? sourceState?.isLoadingMore ?? false : false,
        loadMore: isAsync ? sourceState?.loadMore ?? (() => {}) : () => {},
        shouldClientFilter: shouldFilterProp ?? !isAsync
    };
}

// --- Component ---

export function MultiSelectCombobox<T = unknown>({
    options: staticOptions,
    values,
    onChange,
    valueSource,
    searchable = true,
    isLoading = false,
    maxSelections,
    isMultiSelect = true,
    onClose,
    autoCloseOnSelect = false,
    className,
    searchInputClassName,
    shouldFilter: shouldFilterProp,
    onSearchChange: onSearchChangeProp,
    i18n: i18nOverrides,
    renderItem,
    header,
    footer
}: Readonly<MultiSelectComboboxProps<T>>) {
    const i18n = useMemo(
        () => ({...DEFAULT_MULTI_SELECT_I18N, ...i18nOverrides}),
        [i18nOverrides]
    );

    const [searchInput, setSearchInput] = useState('');
    const updateSearchInput = useCallback((value: string) => {
        setSearchInput(value);
        onSearchChangeProp?.(value);
    }, [onSearchChangeProp]);

    // --- ValueSource integration ---
    const source = useResolvedSource(valueSource, staticOptions, searchInput, values, isLoading, shouldFilterProp);
    const resolvedOptions = source.options;

    // --- Option caching (preserve selected options during async search) ---
    const [cachedSelectedOptions, setCachedSelectedOptions] = useState<FilterOption<T>[]>([]);

    const optionsFromResolved = useMemo(
        () => resolvedOptions.filter(opt => values.includes(opt.value)),
        [resolvedOptions, values]
    );

    useEffect(() => {
        if (values.length === 0) {
            setCachedSelectedOptions([]);
            return;
        }
        if (optionsFromResolved.length > 0) {
            setCachedSelectedOptions((prev) => {
                const result: FilterOption<T>[] = [];
                for (const value of values) {
                    const option = optionsFromResolved.find(opt => opt.value === value)
                        ?? prev.find(opt => opt.value === value);
                    if (option) {
                        result.push(option);
                    }
                }
                return result;
            });
        }
    }, [optionsFromResolved, values]);

    const selectedOptions = useMemo(() => {
        if (values.length === 0) {
            return [];
        }
        return cachedSelectedOptions.length > 0 ? cachedSelectedOptions : optionsFromResolved;
    }, [cachedSelectedOptions, values.length, optionsFromResolved]);

    const visibleSelectedOptions = useMemo(
        () => filterOptionsBySearch(selectedOptions, searchInput),
        [searchInput, selectedOptions]
    );

    const unselectedOptions = resolvedOptions.filter(opt => !values.includes(opt.value));

    // --- Handlers ---

    const handleDeselect = useCallback((option: FilterOption<T>) => {
        onChange(values.filter(v => v !== option.value));
    }, [onChange, values]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleDeselectSingle = (_option: FilterOption<T>) => {
        onChange([]);
        onClose?.();
    };

    const handleSelectMulti = (option: FilterOption<T>) => {
        const newValues = [...values, option.value];
        if (maxSelections && newValues.length > maxSelections) {
            return;
        }
        onChange(newValues);
        if (autoCloseOnSelect) {
            onClose?.();
        }
    };

    const handleSelectSingle = (option: FilterOption<T>) => {
        onChange([option.value]);
        onClose?.();
    };

    const handleSelectSelected = isMultiSelect ? handleDeselect : handleDeselectSingle;
    const handleSelectUnselected = isMultiSelect ? handleSelectMulti : handleSelectSingle;

    const clearSearch = useCallback(() => updateSearchInput(''), [updateSearchInput]);

    // --- Default item renderer ---

    const getCommandItemValue = (option: FilterOption<T>, isSelected: boolean): string | undefined => {
        if (isSelected) {
            return undefined;
        }
        const detail = option.detail ? ` - ${option.detail}` : '';
        return option.label + detail;
    };

    const defaultRenderItem = ({option, isSelected, onSelect}: RenderItemProps<T>) => (
        <CommandItem
            key={String(option.value)}
            className="group flex items-center gap-2"
            value={getCommandItemValue(option, isSelected)}
            onSelect={onSelect}
        >
            {option.icon}
            <div className="flex flex-col overflow-hidden">
                <span className="truncate text-accent-foreground" title={option.label}>{option.label}</span>
                {option.detail && <span className="truncate text-sm text-muted-foreground" title={option.detail}>{option.detail}</span>}
            </div>
            <Check className={cn('ms-auto text-primary', !isSelected && 'opacity-0')} />
        </CommandItem>
    );

    const itemRenderer = renderItem ?? defaultRenderItem;

    // --- Render ---

    return (
        <div className={cn('w-full', className)}>
            <Command shouldFilter={source.shouldClientFilter}>
                {header?.({selectedOptions, onDeselect: handleDeselect})}
                {searchable && (
                    <div className="relative">
                        <CommandInput
                            className={cn('h-(--control-height) pr-8 text-sm', searchInputClassName)}
                            placeholder={i18n.searchPlaceholder}
                            value={searchInput}
                            onValueChange={updateSearchInput}
                        />
                        {source.isSearching && (
                            <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                        )}
                    </div>
                )}
                <CommandList className="outline-hidden">
                    {source.isInitialLoad ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            {i18n.loading}
                        </div>
                    ) : (
                        <CommandEmpty>{i18n.noResultsFound}</CommandEmpty>
                    )}

                    {visibleSelectedOptions.length > 0 && (
                        <CommandGroup heading={i18n.selectedHeading}>
                            {visibleSelectedOptions.map(option => itemRenderer({
                                option,
                                isSelected: true,
                                onSelect: () => handleSelectSelected(option)
                            }))}
                        </CommandGroup>
                    )}

                    {unselectedOptions.length > 0 && (
                        <>
                            {visibleSelectedOptions.length > 0 && <CommandSeparator />}
                            <CommandGroup>
                                {unselectedOptions.map(option => itemRenderer({
                                    option,
                                    isSelected: false,
                                    onSelect: () => handleSelectUnselected(option)
                                }))}
                            </CommandGroup>
                        </>
                    )}

                    {source.hasMore && (
                        <>
                            {(visibleSelectedOptions.length > 0 || unselectedOptions.length > 0) && <CommandSeparator />}
                            <div className="p-1.5">
                                <button
                                    className="flex w-full items-center justify-center rounded-xs px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                                    disabled={source.isLoadingMore}
                                    type="button"
                                    onClick={source.loadMore}
                                >
                                    {source.isLoadingMore && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    {source.isLoadingMore ? i18n.loading : i18n.loadMore}
                                </button>
                            </div>
                        </>
                    )}
                </CommandList>
                {footer?.({searchInput, clearSearch})}
            </Command>
        </div>
    );
}
