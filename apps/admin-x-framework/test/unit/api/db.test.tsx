import {act} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {renderHookWithProviders} from '../../../src/test/test-utils';
import {useImportContent} from '../../../src/api/db';
import {withMockFetch} from '../../utils/mock-fetch';

describe('db api', () => {
    it('imports JSON content via the db endpoint', async () => {
        const file = new File(['{}'], 'export.json', {type: 'application/json'});

        await withMockFetch({}, async (mock) => {
            const {result} = renderHookWithProviders(() => useImportContent());

            await act(async () => {
                await result.current.mutateAsync(file);
            });

            expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/db/');
            expect(mock.calls[0][1].method).toBe('POST');
            expect(mock.calls[0][1].body).toBeInstanceOf(FormData);
            expect(mock.calls[0][1].body.get('importfile')).toBe(file);
            expect(mock.calls[0][1].headers).not.toHaveProperty('content-type');
        });
    });

    it('imports zip content via the db endpoint', async () => {
        const file = new File(['PK'], 'export.zip', {type: 'application/zip'});

        await withMockFetch({}, async (mock) => {
            const {result} = renderHookWithProviders(() => useImportContent());

            await act(async () => {
                await result.current.mutateAsync(file);
            });

            expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/db/');
            expect(mock.calls[0][1].body.get('importfile')).toBe(file);
        });
    });
});
