import {act} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ValidationError} from '../../../src/utils/errors';
import {renderHookWithProviders} from '../../../src/test/test-utils';
import {useCreateLabel, useEditLabel, useFindLabelByName} from '../../../src/api/labels';
import {withMockFetch} from '../../utils/mock-fetch';

const {mockSonnerError} = vi.hoisted(() => ({
    mockSonnerError: vi.fn()
}));

vi.mock('sonner', () => ({
    toast: {
        error: mockSonnerError,
        dismiss: vi.fn()
    }
}));

const duplicateLabelResponse = {
    errors: [{
        code: 'VALIDATION',
        context: 'Label already exists',
        details: null,
        ghostErrorCode: null,
        help: null,
        id: 'label-error-id',
        message: 'Validation error, cannot save label.',
        property: null,
        type: 'ValidationError'
    }]
};

const existingLabel = {
    id: 'label-1',
    name: 'Existing label',
    slug: 'existing-label',
    created_at: '',
    updated_at: ''
};

const mockErrorFetch = {
    json: duplicateLabelResponse,
    headers: {'content-type': 'application/json'},
    ok: false,
    status: 422
};

describe('labels api', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects duplicate creates without reporting - the picker owns recovery', async () => {
        await withMockFetch(mockErrorFetch, async () => {
            const {result} = renderHookWithProviders(() => useCreateLabel());

            await act(async () => {
                await expect(result.current.mutateAsync({name: 'Existing label'})).rejects.toBeInstanceOf(ValidationError);
            });

            expect(mockSonnerError).not.toHaveBeenCalled();
        });
    });

    it('finds a label by name', async () => {
        await withMockFetch({
            json: {labels: [existingLabel]},
            headers: {'content-type': 'application/json'},
            ok: true,
            status: 200
        }, async (mock) => {
            const {result} = renderHookWithProviders(() => useFindLabelByName());

            await act(async () => {
                await expect(result.current(`O'Existing label`)).resolves.toEqual(existingLabel);
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.searchParams.get('filter')).toBe(String.raw`name:'O\'Existing label'`);
            expect(url.searchParams.get('limit')).toBe('1');
        });
    });

    it('does not escape backslashes in the lookup filter', async () => {
        await withMockFetch({
            json: {labels: []},
            headers: {'content-type': 'application/json'},
            ok: true,
            status: 200
        }, async (mock) => {
            const {result} = renderHookWithProviders(() => useFindLabelByName());

            await act(async () => {
                await result.current('trailing\\');
            });

            // NQL keeps lone backslashes literal and only unescapes \' and \",
            // so a doubled backslash would query a two-backslash name
            const url = new URL(mock.calls[0][0] as string);
            expect(url.searchParams.get('filter')).toBe(String.raw`name:'trailing\'`);
        });
    });

    it('resolves undefined when no label matches the name', async () => {
        await withMockFetch({
            json: {labels: []},
            headers: {'content-type': 'application/json'},
            ok: true,
            status: 200
        }, async () => {
            const {result} = renderHookWithProviders(() => useFindLabelByName());

            await act(async () => {
                await expect(result.current('Missing label')).resolves.toBeUndefined();
            });
        });
    });

    it('rejects duplicate edits without reporting - the edit row surfaces them', async () => {
        await withMockFetch(mockErrorFetch, async () => {
            const {result} = renderHookWithProviders(() => useEditLabel());

            await act(async () => {
                await expect(result.current.mutateAsync({id: 'label-1', name: 'Existing label'})).rejects.toBeInstanceOf(ValidationError);
            });

            expect(mockSonnerError).not.toHaveBeenCalled();
        });
    });
});
