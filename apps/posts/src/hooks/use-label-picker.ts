import {APIError, ValidationError} from '@tryghost/admin-x-framework/errors';
import {Label, useCreateLabel, useDeleteLabel, useEditLabel, useFindLabelByName, useInvalidateLabels} from '@tryghost/admin-x-framework/api/labels';
import {ValueSource} from '@tryghost/shade/patterns';
import {useCallback, useMemo, useRef, useState} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useLabelValueSource} from './filter-sources/use-label-value-source';
import type {ComboboxOptionSource} from '@tryghost/shade/components';

export interface UseLabelPickerOptions {
    selectedSlugs: string[];
    onSelectionChange: (slugs: string[]) => void;
    valueSource?: ValueSource<string>;
}

export interface UseLabelPickerResult {
    labels: Label[];
    optionSource: ComboboxOptionSource<string>;
    selectedSlugs: string[];
    resolvedSelectedLabels: Label[];

    toggleLabel: (slug: string) => void;
    createLabel: (name: string) => Promise<Label | undefined>;
    editLabel: (id: string, name: string) => Promise<void>;
    deleteLabel: (id: string) => Promise<void>;
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
    const optionSource: ComboboxOptionSource<string> = {
        ...labelSourceState,
        shouldClientFilter: false,
        onSearchChange: setSearchValue
    };

    const {mutateAsync: createLabelMutation, isLoading: isCreating} = useCreateLabel();
    const {mutateAsync: editLabelMutation} = useEditLabel();
    const {mutateAsync: deleteLabelMutation} = useDeleteLabel();
    const findLabelByName = useFindLabelByName();
    const invalidateLabels = useInvalidateLabels();
    const handleError = useHandleError();

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

    const createLabel = useCallback(async (name: string): Promise<Label | undefined> => {
        const trimmed = name.trim();
        if (!trimmed) {
            return undefined;
        }
        try {
            const result = await createLabelMutation({name: trimmed});
            return result?.labels?.[0];
        } catch (error) {
            // A rejected duplicate (e.g. created by another admin since the
            // list loaded) is adopted as if the create succeeded - the lookup
            // confirms it exists
            if (error instanceof ValidationError) {
                let existing;
                try {
                    existing = await findLabelByName(trimmed);
                } catch {
                    // report the original rejection below
                }
                if (existing) {
                    invalidateLabels();
                    return existing;
                }
            }
            handleError(error);
            throw error;
        }
    }, [createLabelMutation, findLabelByName, handleError, invalidateLabels]);

    const editLabel = useCallback(async (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) {
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
    }, [editLabelMutation, labels, onSelectionChange]);

    const deleteLabel = useCallback(async (id: string) => {
        const label = labels.find(l => l.id === id);
        try {
            await deleteLabelMutation(id);
        } catch (error) {
            // A label that is already gone fulfils the delete; anything else
            // is unexpected, so report it and rethrow for the edit row to
            // reset its state
            if (error instanceof APIError && error.response?.status === 404) {
                invalidateLabels();
            } else {
                handleError(error);
                throw error;
            }
        }
        if (label) {
            const current = selectedSlugsRef.current;
            if (current.includes(label.slug)) {
                onSelectionChange(current.filter(s => s !== label.slug));
            }
        }
    }, [deleteLabelMutation, handleError, invalidateLabels, labels, onSelectionChange]);

    return {
        labels,
        optionSource,
        selectedSlugs,
        resolvedSelectedLabels: selectedSlugs
            .map(slug => labels.find(label => label.slug === slug))
            .filter((label): label is Label => !!label),
        toggleLabel,
        createLabel,
        editLabel,
        deleteLabel,
        isCreating
    };
}
