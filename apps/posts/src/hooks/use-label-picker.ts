import {Label, useCreateLabel, useDeleteLabel, useEditLabel} from '@tryghost/admin-x-framework/api/labels';
import {ValueSource} from '@tryghost/shade';
import {useCallback, useMemo, useRef, useState} from 'react';
import {useLabelValueSource} from './filter-sources/use-label-value-source';

export interface UseLabelPickerOptions {
    selectedSlugs: string[];
    onSelectionChange: (slugs: string[]) => void;
    valueSource?: ValueSource<string>;
}

export interface UseLabelPickerResult {
    labels: Label[];
    selectedSlugs: string[];
    resolvedSelectedLabels: Label[];

    isLoading: boolean;
    searchValue: string;
    onSearchChange: (search: string) => void;
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
    onSelectionChange,
    valueSource
}: UseLabelPickerOptions): UseLabelPickerResult {
    const defaultLabelValueSource = useLabelValueSource();
    const labelValueSource = valueSource ?? defaultLabelValueSource;
    const [searchValue, setSearchValue] = useState('');
    const labelSourceState = labelValueSource.useOptions({
        query: searchValue,
        selectedValues: selectedSlugs
    });
    const labels = useMemo(() => {
        return labelSourceState.options.flatMap((option) => {
            if (!option.metadata?.id) {
                return [];
            }

            return [{
                id: String(option.metadata.id),
                name: option.label,
                slug: String(option.value),
                created_at: '',
                updated_at: ''
            }];
        });
    }, [labelSourceState.options]);

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
        selectedSlugs,
        resolvedSelectedLabels: selectedSlugs
            .map(slug => labels.find(label => label.slug === slug))
            .filter((label): label is Label => !!label),
        // Keep the current picker content visible during background refreshes
        // after create/edit/delete; only block the UI on the initial empty load.
        isLoading: labelSourceState.isInitialLoad,
        searchValue,
        onSearchChange: setSearchValue,
        toggleLabel,
        createLabel,
        editLabel,
        deleteLabel,
        isDuplicateName,
        canCreateFromSearch,
        isCreating
    };
}
