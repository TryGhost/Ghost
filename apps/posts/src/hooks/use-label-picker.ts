import {Label, getLabelBySlug, useBrowseLabelsInfinite, useCreateLabel, useDeleteLabel, useEditLabel} from '@tryghost/admin-x-framework/api/labels';
import {escapeNqlString} from '@src/views/filters/filter-normalization';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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

    // --- Selected labels cache (mirrors shade's cachedSelectedOptions pattern) ---
    const [cachedSelectedLabels, setCachedSelectedLabels] = useState<Label[]>([]);

    useEffect(() => {
        if (selectedSlugs.length === 0) {
            setCachedSelectedLabels([]);
            return;
        }

        setCachedSelectedLabels((prev) => {
            const result = selectedSlugs.map((slug) => {
                // Prefer fresh label from current items or base snapshot
                const fresh = labelSearch.items.find(l => l.slug === slug)
                    || labelSearch.allItems.find(l => l.slug === slug);
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
    }, [selectedSlugs, labelSearch.items, labelSearch.allItems]);

    // Find first selected slug not yet in cache — resolve async
    const missingSlug = useMemo(() => {
        if (selectedSlugs.length === 0) {
            return '';
        }
        const knownSlugs = new Set(cachedSelectedLabels.map(l => l.slug));
        return selectedSlugs.find(s => !knownSlugs.has(s)) || '';
    }, [selectedSlugs, cachedSelectedLabels]);

    const resolvedLabelResult = getLabelBySlug(missingSlug || '', {
        enabled: !!missingSlug,
        defaultErrorHandler: false
    });

    useEffect(() => {
        if (!resolvedLabelResult.data || !missingSlug) {
            return;
        }
        const label = resolvedLabelResult.data.labels?.[0];
        if (label) {
            setCachedSelectedLabels((prev) => {
                if (prev.some(l => l.slug === label.slug)) {
                    return prev;
                }
                return [...prev, label];
            });
        }
    }, [resolvedLabelResult.data, missingSlug]);

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

    const isDuplicateName = useCallback((name: string, excludeId?: string) => {
        const normalized = name.trim().toLowerCase();
        return labels.some(l => l.name.toLowerCase() === normalized && l.id !== excludeId);
    }, [labels]);

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
        const oldLabel = labels.find(l => l.id === id);
        const result = await editLabelMutation({id, name: trimmed});
        const updatedLabel = result?.labels?.[0];
        // If the slug changed and the old slug was selected, swap it
        if (oldLabel && updatedLabel && oldLabel.slug !== updatedLabel.slug) {
            const current = selectedSlugsRef.current;
            if (current.includes(oldLabel.slug)) {
                onSelectionChange(current.map(s => (s === oldLabel.slug ? updatedLabel.slug : s)));
            }
        }
    }, [editLabelMutation, isDuplicateName, labels, onSelectionChange]);

    const deleteLabel = useCallback(async (id: string) => {
        const label = labels.find(l => l.id === id);
        await deleteLabelMutation(id);
        if (label) {
            const current = selectedSlugsRef.current;
            if (current.includes(label.slug)) {
                onSelectionChange(current.filter(s => s !== label.slug));
            }
        }
    }, [deleteLabelMutation, labels, onSelectionChange]);

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
