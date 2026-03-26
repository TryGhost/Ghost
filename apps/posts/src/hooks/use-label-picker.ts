import {Label, getLabelBySlug, useBrowseLabelsInfinite, useCreateLabel, useDeleteLabel, useEditLabel} from '@tryghost/admin-x-framework/api/labels';
import {escapeNqlString} from '@src/views/filters/filter-normalization';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useFilterSearch} from '@src/hooks/use-filter-search';

export interface UseLabelPickerOptions {
    selectedSlugs: string[];
    onSelectionChange: (slugs: string[]) => void;
}

export interface UseLabelPickerResult {
    labels: Label[];
    selectedLabels: Label[];

    isLoading: boolean;
    isFetching: boolean;
    searchValue: string;
    onSearchChange: (search: string) => void;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
    toggleLabel: (slug: string) => void;
    createLabel: (name: string) => Promise<Label | undefined>;
    editLabel: (id: string, name: string) => Promise<void>;
    deleteLabel: (id: string) => Promise<void>;
    isDuplicateName: (name: string, excludeId?: string) => boolean;
    canCreateFromSearch: (inputValue: string) => boolean;
    isCreating: boolean;
}

export function useLabelPicker({
    selectedSlugs,
    onSelectionChange
}: UseLabelPickerOptions): UseLabelPickerResult {
    const labelSearch = useFilterSearch({
        useQuery: useBrowseLabelsInfinite,
        dataKey: 'labels',
        serverSearchParams: (term): Record<string, string> => (term ? {filter: `name:~${escapeNqlString(term)}`} : {}),
        localSearchFilter: (labels, term) => labels.filter(l => l.name.toLowerCase().includes(term.toLowerCase())),
        toOption: l => ({value: l.slug, label: l.name}),
        useGetById: getLabelBySlug,
        activeValues: selectedSlugs
    });

    const labels = labelSearch.items;
    const isLoading = labelSearch.isLoading;

    // --- Selected labels cache ---
    // Derives selected Label objects from useFilterSearch's data sources
    // (allItems for base snapshot, resolvedItems for async-fetched values)
    // so we don't run a parallel fetch chain.
    const [cachedSelectedLabels, setCachedSelectedLabels] = useState<Label[]>([]);

    useEffect(() => {
        if (selectedSlugs.length === 0) {
            setCachedSelectedLabels([]);
            return;
        }

        setCachedSelectedLabels((prev) => {
            const result = selectedSlugs.map((slug) => {
                // Check all available label sources from useFilterSearch
                const fresh = labelSearch.allItems.find(l => l.slug === slug)
                    || labelSearch.items.find(l => l.slug === slug)
                    || labelSearch.resolvedItems.find(l => l.slug === slug);
                if (fresh) {
                    return fresh;
                }
                // Fall back to previously cached
                return prev.find(l => l.slug === slug) || null;
            }).filter((l): l is Label => !!l);

            // Avoid unnecessary state updates
            if (result.length === prev.length && result.every((l, i) => l.slug === prev[i]?.slug && l.name === prev[i]?.name)) {
                return prev;
            }
            return result;
        });
    }, [selectedSlugs, labelSearch.items, labelSearch.allItems, labelSearch.resolvedItems]);

    const {mutateAsync: createLabelMutation, isLoading: isCreating} = useCreateLabel();
    const {mutateAsync: editLabelMutation} = useEditLabel();
    const {mutateAsync: deleteLabelMutation} = useDeleteLabel();

    // Ref to always read the latest selectedSlugs in callbacks,
    // avoiding stale closures and keeping callbacks stable
    const selectedSlugsRef = useRef(selectedSlugs);
    selectedSlugsRef.current = selectedSlugs;

    const toggleLabel = useCallback((slug: string) => {
        const current = selectedSlugsRef.current;
        if (current.includes(slug)) {
            onSelectionChange(current.filter(s => s !== slug));
        } else {
            onSelectionChange([...current, slug]);
        }
    }, [onSelectionChange]);

    const findLoadedLabelById = useCallback((id: string) => {
        return labelSearch.allItems.find(l => l.id === id)
            || labelSearch.items.find(l => l.id === id)
            || labelSearch.resolvedItems.find(l => l.id === id);
    }, [labelSearch.allItems, labelSearch.items, labelSearch.resolvedItems]);

    const isDuplicateName = useCallback((name: string, excludeId?: string) => {
        const normalized = name.trim().toLowerCase();
        // Check all loaded label sources so duplicates aren't missed when search
        // narrows the visible list. This only covers locally-loaded labels —
        // the server enforces uniqueness for labels beyond the first page.
        return [...labelSearch.allItems, ...labelSearch.items, ...labelSearch.resolvedItems]
            .some(l => l.name.toLowerCase() === normalized && l.id !== excludeId);
    }, [labelSearch.allItems, labelSearch.items, labelSearch.resolvedItems]);

    const canCreateFromSearch = useCallback((inputValue: string) => {
        const trimmed = inputValue.trim();
        if (!trimmed) {
            return false;
        }
        return !isDuplicateName(trimmed);
    }, [isDuplicateName]);

    const createLabel = useCallback(async (name: string): Promise<Label | undefined> => {
        const trimmed = name.trim();
        if (!trimmed || isDuplicateName(trimmed)) {
            return undefined;
        }
        const result = await createLabelMutation({name: trimmed});
        const newLabel = result?.labels?.[0];
        return newLabel;
    }, [createLabelMutation, isDuplicateName]);

    const editLabel = useCallback(async (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed || isDuplicateName(trimmed, id)) {
            return;
        }
        const oldLabel = findLoadedLabelById(id);
        const result = await editLabelMutation({id, name: trimmed});
        const updatedLabel = result?.labels?.[0];
        // If the slug changed and the old slug was selected, swap it
        if (oldLabel && updatedLabel && oldLabel.slug !== updatedLabel.slug) {
            const current = selectedSlugsRef.current;
            if (current.includes(oldLabel.slug)) {
                onSelectionChange(current.map(s => (s === oldLabel.slug ? updatedLabel.slug : s)));
            }
        }
    }, [editLabelMutation, findLoadedLabelById, isDuplicateName, onSelectionChange]);

    const deleteLabel = useCallback(async (id: string) => {
        const label = findLoadedLabelById(id);
        await deleteLabelMutation(id);
        if (label) {
            const current = selectedSlugsRef.current;
            if (current.includes(label.slug)) {
                onSelectionChange(current.filter(s => s !== label.slug));
            }
        }
    }, [deleteLabelMutation, findLoadedLabelById, onSelectionChange]);

    return {
        labels,
        selectedLabels: cachedSelectedLabels,
        isLoading,
        isFetching: labelSearch.isFetching,
        searchValue: labelSearch.searchValue,
        onSearchChange: labelSearch.onSearchChange,
        onLoadMore: labelSearch.onLoadMore,
        hasMore: labelSearch.hasMore,
        isLoadingMore: labelSearch.isLoadingMore,
        toggleLabel,
        createLabel,
        editLabel,
        deleteLabel,
        isDuplicateName,
        canCreateFromSearch,
        isCreating
    };
}
