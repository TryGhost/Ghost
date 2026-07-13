import {act, waitFor} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {ValidationError} from '../../../src/utils/errors';
import {renderHookWithProviders} from '../../../src/test/test-utils';
import {useBrowseMemberCustomFields, useCreateMemberCustomField, useDeleteMemberCustomField, useEditMemberCustomField} from '../../../src/api/member-custom-fields';
import type {MemberCustomField} from '../../../src/api/member-custom-fields';
import {withMockFetch} from '../../utils/mock-fetch';

const textField: MemberCustomField = {
    id: 'field-1',
    key: 'company',
    name: 'Company',
    type: 'text',
    created_at: '2026-07-13T00:00:00.000Z',
    updated_at: null
};

const duplicateKeyResponse = {
    errors: [{
        code: null,
        context: null,
        details: null,
        ghostErrorCode: null,
        help: null,
        id: 'field-error-id',
        message: 'A custom field with this key already exists.',
        property: 'key',
        type: 'ValidationError'
    }]
};

describe('member custom fields api', () => {
    it('browses field definitions', async () => {
        await withMockFetch({
            json: {member_custom_fields: [textField]}
        }, async (mock) => {
            const {result} = renderHookWithProviders(() => useBrowseMemberCustomFields());

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data?.member_custom_fields).toEqual([textField]);
            // The providers also fetch users/me, so find our request rather than
            // assuming call order
            const paths = mock.calls.map((call: [string]) => new URL(call[0]).pathname);
            expect(paths).toContain('/ghost/api/admin/members/custom_fields/');
        });
    });

    it('creates a field with the wrapped wire format', async () => {
        await withMockFetch({
            json: {member_custom_fields: [textField]}
        }, async (mock) => {
            const {result} = renderHookWithProviders(() => useCreateMemberCustomField());

            await act(async () => {
                await result.current.mutateAsync({key: 'company', name: 'Company', type: 'text'});
            });

            const [url, options] = mock.calls[0];
            expect(new URL(url as string).pathname).toMatch(/\/members\/custom_fields\/$/);
            expect(options.method).toBe('POST');
            expect(JSON.parse(options.body as string)).toEqual({
                member_custom_fields: [{key: 'company', name: 'Company', type: 'text'}]
            });
        });
    });

    it('rejects a duplicate key create with a validation error', async () => {
        await withMockFetch({
            json: duplicateKeyResponse,
            headers: {'content-type': 'application/json'},
            ok: false,
            status: 422
        }, async () => {
            const {result} = renderHookWithProviders(() => useCreateMemberCustomField());

            await act(async () => {
                await expect(result.current.mutateAsync({key: 'company', name: 'Company', type: 'text'})).rejects.toBeInstanceOf(ValidationError);
            });
        });
    });

    it('edits only the name - keys are immutable after creation', async () => {
        await withMockFetch({
            json: {member_custom_fields: [{...textField, name: 'Employer'}]}
        }, async (mock) => {
            const {result} = renderHookWithProviders(() => useEditMemberCustomField());

            await act(async () => {
                await result.current.mutateAsync({id: 'field-1', name: 'Employer'});
            });

            const [url, options] = mock.calls[0];
            expect(new URL(url as string).pathname).toMatch(/\/members\/custom_fields\/field-1\/$/);
            expect(options.method).toBe('PUT');
            expect(JSON.parse(options.body as string)).toEqual({
                member_custom_fields: [{name: 'Employer'}]
            });
        });
    });

    it('deletes a field by id', async () => {
        await withMockFetch({json: {}}, async (mock) => {
            const {result} = renderHookWithProviders(() => useDeleteMemberCustomField());

            await act(async () => {
                await result.current.mutateAsync('field-1');
            });

            const [url, options] = mock.calls[0];
            expect(new URL(url as string).pathname).toMatch(/\/members\/custom_fields\/field-1\/$/);
            expect(options.method).toBe('DELETE');
        });
    });
});
