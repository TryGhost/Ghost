import {act} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {renderHookWithProviders} from '../../../src/test/test-utils';
import {useDeleteSession} from '../../../src/api/session';
import {withMockFetch} from '../../utils/mock-fetch';

describe('session api', () => {
    it('signs out via DELETE and resolves the 204 with no data', async () => {
        await withMockFetch({status: 204}, async (mock) => {
            const {result} = renderHookWithProviders(() => useDeleteSession());

            let response: unknown = 'unset';
            await act(async () => {
                response = await result.current.mutateAsync(null);
            });

            expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/session/');
            expect(mock.calls[0][1].method).toBe('DELETE');
            expect(mock.calls[0][1].credentials).toBe('include');
            expect(response).toBeUndefined();
        });
    });
});
