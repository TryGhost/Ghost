import {Label, useBrowseInfiniteLabels, useCreateLabel, useDeleteLabel, useEditLabel} from '@tryghost/admin-x-framework/api/labels';
import {escapeNqlString} from '@src/views/filters/filter-normalization';
import {useCallback, useMemo, useRef} from 'react';
import {useInfiniteSearch} from './use-infinite-search';

export interface UseLabelPickerOptions {
    selectedSlugs: string[];
    onSelectionChange: (slugs: string[]) => void;
}

export interface UseLabelPickerResult {
    labels: Label[];
    selectedSlugs: string[];

    isLoading: boolean;
    toggleLabel: (slug: string) => void;
    createLabel: (name: string) => Promise<Label | undefined>;
    editLabel: (id: string, name: string) => Promise<void>;
    deleteLabel: (id: string) => Promise<void>;
    isDuplicateName: (name: string, excludeId?: string) => boolean;
    canCreateFromSearch: (inputValue: string) => boolean;
    isCreating: boolean;

    // Search + infinite scroll (undefined onSearchChange = local filtering)
    onSearchChange: ((search: string) => void) | undefined;
    searchValue: string;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
}

const buildLabelSearchFilter = (term: string) => `name:~${escapeNqlString(term)}`;

export function useLabelPicker({
    selectedSlugs,
    onSelectionChange
}: UseLabelPickerOptions): UseLabelPickerResult {
    const search = useInfiniteSearch({
        useQuery: useBrowseInfiniteLabels,
        buildSearchFilter: buildLabelSearchFilter,
        limit: '100',
        hasData: data => (data?.labels?.length ?? 0) > 0
    });

    const queryLabels = useMemo(() => search.data?.labels || [], [search.data]);

    // Cache labels that have been selected so they remain resolvable when
    // server-side search narrows the result set.
    const selectedLabelCacheRef = useRef<Map<string, Label>>(new Map());
    const selectedSet = new Set(selectedSlugs);
    for (const label of queryLabels) {
        if (selectedSet.has(label.slug)) {
            selectedLabelCacheRef.current.set(label.slug, label);
        }
    }
    // Remove cached entries for labels that are no longer selected
    for (const slug of selectedLabelCacheRef.current.keys()) {
        if (!selectedSet.has(slug)) {
            selectedLabelCacheRef.current.delete(slug);
        }
    }

    // Merge query results with cached selected labels so the UI can always
    // resolve selectedSlugs → Label, even during a search that excludes them.
    const labels = useMemo(() => {
        const slugsInQuery = new Set(queryLabels.map(l => l.slug));
        const missingSelected = selectedSlugs
            .filter(slug => !slugsInQuery.has(slug))
            .map(slug => selectedLabelCacheRef.current.get(slug))
            .filter((l): l is Label => !!l);
        return missingSelected.length > 0 ? [...queryLabels, ...missingSelected] : queryLabels;
    }, [queryLabels, selectedSlugs]);

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
        // Add to cache immediately so the label is resolvable before the
        // invalidation refetch completes (the picker toggles the slug right
        // after this returns).
        if (newLabel) {
            selectedLabelCacheRef.current.set(newLabel.slug, newLabel);
        }
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
        if (oldLabel && updatedLabel) {
            // Update cache so the edited label is resolvable before refetch
            selectedLabelCacheRef.current.delete(oldLabel.slug);
            selectedLabelCacheRef.current.set(updatedLabel.slug, updatedLabel);
            // If the slug changed and the old slug was selected, swap it
            if (oldLabel.slug !== updatedLabel.slug) {
                const current = selectedSlugsRef.current;
                if (current.includes(oldLabel.slug)) {
                    onSelectionChange(current.map(s => (s === oldLabel.slug ? updatedLabel.slug : s)));
                }
            }
        }
    }, [editLabelMutation, isDuplicateName, labels, onSelectionChange]);

    const deleteLabel = useCallback(async (id: string) => {
        const label = labels.find(l => l.id === id);
        await deleteLabelMutation(id);
        if (label) {
            selectedLabelCacheRef.current.delete(label.slug);
            const current = selectedSlugsRef.current;
            if (current.includes(label.slug)) {
                onSelectionChange(current.filter(s => s !== label.slug));
            }
        }
    }, [deleteLabelMutation, labels, onSelectionChange]);

    return {
        labels,
        selectedSlugs,
        isLoading: search.isLoading || search.isSearchLoading,
        toggleLabel,
        createLabel,
        editLabel,
        deleteLabel,
        isDuplicateName,
        canCreateFromSearch,
        isCreating,
        // Return undefined when using local search so the picker uses client-side filtering
        onSearchChange: search.isLocalSearch ? undefined : search.onSearchChange,
        searchValue: search.searchValue,
        onLoadMore: search.onLoadMore,
        hasMore: search.hasMore,
        isLoadingMore: search.isLoadingMore
    };
}
