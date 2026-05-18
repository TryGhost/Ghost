import {act} from '@testing-library/react';
import {AlreadyExistsError, ValidationError} from '../../../src/utils/errors';
import {describe, expect, it} from 'vitest';
import {renderHookWithProviders} from '../../../src/test/test-utils';
import {useCreateLabel, useEditLabel} from '../../../src/api/labels';
import {withMockFetch} from '../../utils/mock-fetch';

const createValidationErrorResponse = ({
    code,
    context,
    property = null
}: {
    code: string;
    context: string;
    property?: string | null;
}) => ({
    errors: [{
        code,
        context,
        details: null,
        ghostErrorCode: null,
        help: null,
        id: 'label-error-id',
        message: 'Validation error, cannot save label.',
        property,
        type: 'ValidationError'
    }]
});

describe('labels api', () => {
    it('maps duplicate create errors to AlreadyExistsError', async () => {
        await withMockFetch({
            json: createValidationErrorResponse({
                code: 'LABEL_ALREADY_EXISTS',
                context: 'Label already exists'
            }),
            headers: {'content-type': 'application/json'},
            ok: false,
            status: 422
        }, async () => {
            const {result} = renderHookWithProviders(() => useCreateLabel());

            await act(async () => {
                await expect(result.current.mutateAsync({name: 'Existing label'})).rejects.toBeInstanceOf(AlreadyExistsError);
            });
        });
    });

    it('maps duplicate edit errors to AlreadyExistsError', async () => {
        await withMockFetch({
            json: createValidationErrorResponse({
                code: 'LABEL_ALREADY_EXISTS',
                context: 'Label already exists'
            }),
            headers: {'content-type': 'application/json'},
            ok: false,
            status: 422
        }, async () => {
            const {result} = renderHookWithProviders(() => useEditLabel());

            await act(async () => {
                await expect(result.current.mutateAsync({id: 'label-1', name: 'Existing label'})).rejects.toBeInstanceOf(AlreadyExistsError);
            });
        });
    });

    it('leaves non-duplicate validation errors unchanged', async () => {
        await withMockFetch({
            json: createValidationErrorResponse({
                code: 'VALIDATION',
                context: 'Name is required',
                property: 'name'
            }),
            headers: {'content-type': 'application/json'},
            ok: false,
            status: 422
        }, async () => {
            const {result} = renderHookWithProviders(() => useCreateLabel());

            await act(async () => {
                await expect(result.current.mutateAsync({name: ''})).rejects.toBeInstanceOf(ValidationError);
            });
        });
    });
});
