import {APIError, type ErrorResponse, ValidationError} from '@tryghost/admin-x-framework/errors';
import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useLabelPicker} from '@/members/hooks/use-label-picker';
import type {ValueSource} from '@tryghost/shade/patterns';

const {mockCreateLabel, mockEditLabel, mockDeleteLabel, mockFindLabelByName, mockInvalidateLabels, mockHandleError} = vi.hoisted(() => ({
    mockCreateLabel: vi.fn(),
    mockEditLabel: vi.fn(),
    mockDeleteLabel: vi.fn(),
    mockFindLabelByName: vi.fn(),
    mockInvalidateLabels: vi.fn(),
    mockHandleError: vi.fn()
}));

// These mocks bypass the framework mutations' error reporting, so the tests
// cover only the hook's own contract: what resolves, rejects, and adopts
vi.mock('@tryghost/admin-x-framework/api/labels', () => ({
    useCreateLabel: () => ({mutateAsync: mockCreateLabel}),
    useEditLabel: () => ({mutateAsync: mockEditLabel}),
    useDeleteLabel: () => ({mutateAsync: mockDeleteLabel}),
    useFindLabelByName: () => mockFindLabelByName,
    useInvalidateLabels: () => mockInvalidateLabels
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
    useHandleError: () => mockHandleError
}));

vi.mock('@/shared/filter-sources', () => ({
    useLabelValueSource: () => ({
        id: 'test.labels.default',
        useOptions: () => ({
            options: [],
            isInitialLoad: false,
            isSearching: false,
            isLoadingMore: false,
            hasMore: false,
            loadMore: () => {}
        })
    })
}));

type TestLabel = {id: string; name: string; slug: string};

function makeValidationError(context: string, status = 422) {
    const data: ErrorResponse = {
        errors: [{
            code: 'VALIDATION',
            context,
            details: null,
            ghostErrorCode: null,
            help: '',
            id: 'error-id',
            message: 'Validation error, cannot save label.',
            property: null,
            type: 'ValidationError'
        }]
    };
    return new ValidationError({url: '', status} as unknown as Response, data);
}

function makeValueSource(labels: TestLabel[]): ValueSource<string> {
    return {
        id: 'test.labels',
        useOptions: () => ({
            options: labels.map(label => ({
                value: label.slug,
                label: label.name,
                metadata: {id: label.id}
            })),
            isInitialLoad: false,
            isSearching: false,
            isLoadingMore: false,
            hasMore: false,
            loadMore: () => {}
        })
    };
}

function renderLabelPicker({
    labels = [{id: '1', name: 'Existing', slug: 'existing'}],
    selectedSlugs = [],
    onSelectionChange = vi.fn()
}: {
    labels?: TestLabel[];
    selectedSlugs?: string[];
    onSelectionChange?: (slugs: string[]) => void;
} = {}) {
    return renderHook(() => useLabelPicker({
        selectedSlugs,
        onSelectionChange,
        valueSource: makeValueSource(labels)
    }));
}

describe('useLabelPicker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createLabel', () => {
        it('returns and selects the created label on success', async () => {
            const newLabel = {id: '2', name: 'New', slug: 'new', created_at: '', updated_at: ''};
            mockCreateLabel.mockResolvedValue({labels: [newLabel]});
            const onSelectionChange = vi.fn();

            const {result} = renderLabelPicker({onSelectionChange});

            let created;
            await act(async () => {
                created = await result.current.createLabel('New');
            });

            expect(created).toEqual(newLabel);
            expect(onSelectionChange).toHaveBeenCalledWith(['new']);
        });

        it('adopts and selects the existing label when the API rejects a duplicate', async () => {
            const existing = {id: '9', name: 'Duplicate', slug: 'duplicate', created_at: '', updated_at: ''};
            mockCreateLabel.mockRejectedValue(makeValidationError('Label already exists'));
            mockFindLabelByName.mockResolvedValue(existing);
            const onSelectionChange = vi.fn();

            const {result} = renderLabelPicker({onSelectionChange});

            let created;
            await act(async () => {
                created = await result.current.createLabel('Duplicate');
            });

            expect(created).toEqual(existing);
            expect(onSelectionChange).toHaveBeenCalledWith(['duplicate']);
            expect(mockInvalidateLabels).toHaveBeenCalled();
            expect(mockHandleError).not.toHaveBeenCalled();
        });

        it('does not deselect an adopted label that is already selected', async () => {
            const existing = {id: '9', name: 'Duplicate', slug: 'duplicate', created_at: '', updated_at: ''};
            mockCreateLabel.mockRejectedValue(makeValidationError('Label already exists'));
            mockFindLabelByName.mockResolvedValue(existing);
            const onSelectionChange = vi.fn();

            const {result} = renderLabelPicker({
                labels: [{id: '9', name: 'Duplicate', slug: 'duplicate'}],
                selectedSlugs: ['duplicate'],
                onSelectionChange
            });

            await act(async () => {
                await result.current.createLabel('Duplicate');
            });

            expect(onSelectionChange).not.toHaveBeenCalled();
        });

        it('stays creating while the duplicate adoption lookup is in flight', async () => {
            const existing = {id: '9', name: 'Duplicate', slug: 'duplicate', created_at: '', updated_at: ''};
            mockCreateLabel.mockRejectedValue(makeValidationError('Label already exists'));
            let resolveLookup!: (label: typeof existing) => void;
            mockFindLabelByName.mockImplementation(() => new Promise((resolve) => {
                resolveLookup = resolve;
            }));

            const {result} = renderLabelPicker();

            let createPromise!: Promise<unknown>;
            await act(async () => {
                createPromise = result.current.createLabel('Duplicate');
                // Let the create rejection propagate to the adoption lookup
                await Promise.resolve();
            });

            // The create action must stay disabled until the lookup settles,
            // otherwise a second create can race the first and deselect it
            expect(result.current.isCreating).toBe(true);

            await act(async () => {
                resolveLookup(existing);
                await createPromise;
            });

            expect(result.current.isCreating).toBe(false);
        });

        it('reports the original rejection when the duplicate lookup fails', async () => {
            const validationError = makeValidationError('Label already exists');
            mockCreateLabel.mockRejectedValue(validationError);
            mockFindLabelByName.mockRejectedValue(new Error('Lookup failed'));

            const {result} = renderLabelPicker();

            await act(async () => {
                await expect(result.current.createLabel('Duplicate')).rejects.toBe(validationError);
            });

            expect(mockHandleError).toHaveBeenCalledWith(validationError);
        });

        it('reports and rethrows validation errors with no matching label', async () => {
            const validationError = makeValidationError('Name is too long');
            mockCreateLabel.mockRejectedValue(validationError);
            mockFindLabelByName.mockResolvedValue(undefined);

            const {result} = renderLabelPicker();

            await act(async () => {
                await expect(result.current.createLabel('Rejected name')).rejects.toBe(validationError);
            });

            expect(mockHandleError).toHaveBeenCalledWith(validationError);
        });

        it('does not adopt on permission errors even though they share the ValidationError class', async () => {
            // handle-response maps server NoPermissionError (403) responses to
            // the ValidationError class - a denied create must not be masked
            // as a successful adoption of the existing label
            const permissionError = makeValidationError('You do not have permission', 403);
            mockCreateLabel.mockRejectedValue(permissionError);

            const {result} = renderLabelPicker();

            await act(async () => {
                await expect(result.current.createLabel('Existing')).rejects.toBe(permissionError);
            });

            expect(mockFindLabelByName).not.toHaveBeenCalled();
            expect(mockHandleError).toHaveBeenCalledWith(permissionError);
        });

        it('reports and rethrows non-validation errors without a lookup', async () => {
            const serverError = new Error('Network down');
            mockCreateLabel.mockRejectedValue(serverError);

            const {result} = renderLabelPicker();

            await act(async () => {
                await expect(result.current.createLabel('New label')).rejects.toBe(serverError);
            });

            expect(mockFindLabelByName).not.toHaveBeenCalled();
            expect(mockHandleError).toHaveBeenCalledWith(serverError);
        });

        it('skips the request for empty names', async () => {
            const {result} = renderLabelPicker();

            let created;
            await act(async () => {
                created = await result.current.createLabel('   ');
            });

            expect(created).toBeUndefined();
            expect(mockCreateLabel).not.toHaveBeenCalled();
        });
    });

    describe('editLabel', () => {
        it('rethrows server errors', async () => {
            const serverError = new Error('Label already exists');
            mockEditLabel.mockRejectedValue(serverError);

            const {result} = renderLabelPicker();

            await act(async () => {
                await expect(result.current.editLabel('1', 'Renamed')).rejects.toBe(serverError);
            });
        });

        it('swaps the selected slug when an edit changes it', async () => {
            const onSelectionChange = vi.fn();
            mockEditLabel.mockResolvedValue({
                labels: [{id: '1', name: 'Renamed', slug: 'renamed', created_at: '', updated_at: ''}]
            });

            const {result} = renderLabelPicker({
                selectedSlugs: ['existing'],
                onSelectionChange
            });

            await act(async () => {
                await result.current.editLabel('1', 'Renamed');
            });

            expect(onSelectionChange).toHaveBeenCalledWith(['renamed']);
        });
    });

    describe('deleteLabel', () => {
        it('rethrows server errors and keeps the selection', async () => {
            const serverError = new Error('Cannot delete label');
            mockDeleteLabel.mockRejectedValue(serverError);
            const onSelectionChange = vi.fn();

            const {result} = renderLabelPicker({
                selectedSlugs: ['existing'],
                onSelectionChange
            });

            await act(async () => {
                await expect(result.current.deleteLabel('1')).rejects.toBe(serverError);
            });

            expect(mockHandleError).toHaveBeenCalledWith(serverError);
            expect(onSelectionChange).not.toHaveBeenCalled();
        });

        it('treats an already-deleted label as deleted', async () => {
            const notFound = new APIError({status: 404, url: ''} as unknown as Response);
            mockDeleteLabel.mockRejectedValue(notFound);
            const onSelectionChange = vi.fn();

            const {result} = renderLabelPicker({
                selectedSlugs: ['existing'],
                onSelectionChange
            });

            await act(async () => {
                await result.current.deleteLabel('1');
            });

            expect(mockInvalidateLabels).toHaveBeenCalled();
            expect(onSelectionChange).toHaveBeenCalledWith([]);
        });

        it('removes the deleted label from the selection on success', async () => {
            mockDeleteLabel.mockResolvedValue(undefined);
            const onSelectionChange = vi.fn();

            const {result} = renderLabelPicker({
                selectedSlugs: ['existing'],
                onSelectionChange
            });

            await act(async () => {
                await result.current.deleteLabel('1');
            });

            expect(onSelectionChange).toHaveBeenCalledWith([]);
        });
    });
});
