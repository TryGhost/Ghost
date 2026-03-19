import {act, renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useLabelPicker} from './use-label-picker';
import type {Label} from '@tryghost/admin-x-framework/api/labels';

// --- Mocks ---

const makeLabel = (id: string, name: string, slug?: string): Label => ({
    id,
    name,
    slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
});

const mockLabels = [
    makeLabel('1', 'Alpha', 'alpha'),
    makeLabel('2', 'Beta', 'beta'),
    makeLabel('3', 'Gamma', 'gamma')
];

let mockQueryData = {labels: mockLabels, isEnd: true, meta: undefined};
let mockCreateResult: {labels: Label[]} = {labels: []};
let mockEditResult: {labels: Label[]} = {labels: []};

vi.mock('@tryghost/admin-x-framework/api/labels', () => ({
    useBrowseInfiniteLabels: () => ({
        data: mockQueryData,
        isLoading: false,
        isFetching: false,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false
    }),
    useCreateLabel: () => ({
        mutateAsync: vi.fn().mockImplementation(() => Promise.resolve(mockCreateResult)),
        isLoading: false
    }),
    useEditLabel: () => ({
        mutateAsync: vi.fn().mockImplementation(() => Promise.resolve(mockEditResult))
    }),
    useDeleteLabel: () => ({
        mutateAsync: vi.fn().mockImplementation(() => Promise.resolve())
    })
}));

describe('useLabelPicker', () => {
    it('returns labels from the query', () => {
        const {result} = renderHook(() => useLabelPicker({
            selectedSlugs: [],
            onSelectionChange: vi.fn()
        }));

        expect(result.current.labels).toHaveLength(3);
        expect(result.current.labels.map(l => l.slug)).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('toggleLabel adds and removes slugs', () => {
        const onSelectionChange = vi.fn();
        const {result} = renderHook(() => useLabelPicker({
            selectedSlugs: ['alpha'],
            onSelectionChange
        }));

        // Remove existing
        act(() => {
            result.current.toggleLabel('alpha');
        });
        expect(onSelectionChange).toHaveBeenCalledWith([]);

        // Add new
        onSelectionChange.mockClear();
        act(() => {
            result.current.toggleLabel('beta');
        });
        expect(onSelectionChange).toHaveBeenCalledWith(['alpha', 'beta']);
    });

    it('isDuplicateName checks against existing labels', () => {
        const {result} = renderHook(() => useLabelPicker({
            selectedSlugs: [],
            onSelectionChange: vi.fn()
        }));

        expect(result.current.isDuplicateName('Alpha')).toBe(true);
        expect(result.current.isDuplicateName('alpha')).toBe(true);
        expect(result.current.isDuplicateName('New Label')).toBe(false);
        // Excluding an id
        expect(result.current.isDuplicateName('Alpha', '1')).toBe(false);
    });

    it('canCreateFromSearch rejects duplicates and empty strings', () => {
        const {result} = renderHook(() => useLabelPicker({
            selectedSlugs: [],
            onSelectionChange: vi.fn()
        }));

        expect(result.current.canCreateFromSearch('')).toBe(false);
        expect(result.current.canCreateFromSearch('  ')).toBe(false);
        expect(result.current.canCreateFromSearch('Alpha')).toBe(false);
        expect(result.current.canCreateFromSearch('New Label')).toBe(true);
    });

    it('createLabel returns new label and adds it to the cache immediately', async () => {
        const newLabel = makeLabel('4', 'Delta', 'delta');
        mockCreateResult = {labels: [newLabel]};

        const onSelectionChange = vi.fn();
        const {result, rerender} = renderHook(
            ({slugs}) => useLabelPicker({selectedSlugs: slugs, onSelectionChange}),
            {initialProps: {slugs: [] as string[]}}
        );

        // Create the label
        let created: Label | undefined;
        await act(async () => {
            created = await result.current.createLabel('Delta');
        });

        expect(created).toEqual(newLabel);

        // Simulate what the picker does: toggle the new label's slug
        // The query hasn't refetched yet, but the label should be in the cache
        rerender({slugs: ['delta']});

        // The new label should be resolvable in labels despite not being in query results
        const delta = result.current.labels.find(l => l.slug === 'delta');
        expect(delta).toBeDefined();
        expect(delta?.name).toBe('Delta');
    });

    it('createLabel rejects duplicates', async () => {
        const {result} = renderHook(() => useLabelPicker({
            selectedSlugs: [],
            onSelectionChange: vi.fn()
        }));

        let created: Label | undefined;
        await act(async () => {
            created = await result.current.createLabel('Alpha');
        });

        expect(created).toBeUndefined();
    });

    it('editLabel updates the cache so edited label is resolvable before refetch', async () => {
        const updatedLabel = makeLabel('1', 'Alpha Renamed', 'alpha-renamed');
        mockEditResult = {labels: [updatedLabel]};

        const onSelectionChange = vi.fn();
        const {result, rerender} = renderHook(
            ({slugs}) => useLabelPicker({selectedSlugs: slugs, onSelectionChange}),
            {initialProps: {slugs: ['alpha']}}
        );

        await act(async () => {
            await result.current.editLabel('1', 'Alpha Renamed');
        });

        // Should have swapped the slug in selection
        expect(onSelectionChange).toHaveBeenCalledWith(['alpha-renamed']);

        // Re-render with the updated slugs
        rerender({slugs: ['alpha-renamed']});

        // The renamed label should be resolvable from the cache
        const renamed = result.current.labels.find(l => l.slug === 'alpha-renamed');
        expect(renamed).toBeDefined();
        expect(renamed?.name).toBe('Alpha Renamed');
    });

    it('deleteLabel removes from cache and deselects', async () => {
        const onSelectionChange = vi.fn();
        const {result} = renderHook(() => useLabelPicker({
            selectedSlugs: ['alpha'],
            onSelectionChange
        }));

        await act(async () => {
            await result.current.deleteLabel('1');
        });

        expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('preserves selected labels when they are not in query results', () => {
        // Simulate server search narrowing results: only Beta is returned
        const originalData = mockQueryData;
        mockQueryData = {labels: [mockLabels[1]], isEnd: true, meta: undefined};

        const {result, rerender} = renderHook(
            ({slugs}) => useLabelPicker({selectedSlugs: slugs, onSelectionChange: vi.fn()}),
            {initialProps: {slugs: ['alpha']}}
        );

        // Alpha was selected but is in the original query results, so it
        // should have been cached on a previous render.  We need to first
        // render with the full data to populate the cache.
        mockQueryData = originalData;
        rerender({slugs: ['alpha']});

        // Now narrow query results (simulating server search)
        mockQueryData = {labels: [mockLabels[1]], isEnd: true, meta: undefined};
        rerender({slugs: ['alpha']});

        // Alpha should still be resolvable from the cache
        const alpha = result.current.labels.find(l => l.slug === 'alpha');
        expect(alpha).toBeDefined();
        expect(alpha?.name).toBe('Alpha');

        // Restore
        mockQueryData = originalData;
    });
});
