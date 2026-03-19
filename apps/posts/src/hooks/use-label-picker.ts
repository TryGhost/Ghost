import {Label, useBrowseInfiniteLabels, useCreateLabel, useDeleteLabel, useEditLabel} from '@tryghost/admin-x-framework/api/labels';
import {useCallback, useMemo, useRef, useState} from 'react';

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

    // Server-side search + infinite scroll
    onSearchChange: (search: string) => void;
    searchValue: string;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
}

function escapeNqlValue(term: string): string {
    return term.replace(/'/g, '\'\'');
}

export function useLabelPicker({
    selectedSlugs,
    onSelectionChange
}: UseLabelPickerOptions): UseLabelPickerResult {
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const searchParams = useMemo(() => {
        const params: Record<string, string> = {limit: '100'};
        if (debouncedSearch.trim()) {
            params.filter = `name:~'${escapeNqlValue(debouncedSearch.trim())}'`;
        }
        return params;
    }, [debouncedSearch]);

    const {data: labelsData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage} = useBrowseInfiniteLabels({searchParams});
    const labels = useMemo(() => labelsData?.labels || [], [labelsData]);

    const {mutateAsync: createLabelMutation, isLoading: isCreating} = useCreateLabel();
    const {mutateAsync: editLabelMutation} = useEditLabel();
    const {mutateAsync: deleteLabelMutation} = useDeleteLabel();

    // Ref to always read the latest selectedSlugs in callbacks,
    // avoiding stale closures and keeping callbacks stable
    const selectedSlugsRef = useRef(selectedSlugs);
    selectedSlugsRef.current = selectedSlugs;

    const onSearchChange = useCallback((search: string) => {
        setSearchValue(search);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            setDebouncedSearch(search);
        }, 250);
    }, []);

    const onLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
        selectedSlugs,
        isLoading,
        toggleLabel,
        createLabel,
        editLabel,
        deleteLabel,
        isDuplicateName,
        canCreateFromSearch,
        isCreating,
        onSearchChange,
        searchValue,
        onLoadMore,
        hasMore: hasNextPage ?? false,
        isLoadingMore: isFetchingNextPage
    };
}
