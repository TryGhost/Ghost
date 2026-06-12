import {act} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {useGenerateSlug} from '../../../src/api/slugs';
import {renderHookWithProviders} from '../../../src/test/test-utils';
import {withMockFetch} from '../../utils/mock-fetch';

describe('slugs api', () => {
    it('requests a slug from the slugs endpoint and returns the slug string', async () => {
        await withMockFetch({json: {slugs: [{slug: 'test-post'}]}}, async (mock) => {
            const {result} = renderHookWithProviders(() => useGenerateSlug());

            let slug: string | undefined;

            await act(async () => {
                slug = await result.current.generateSlug({type: 'post', text: 'Test post'});
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/slugs/post/Test%20post/');
            expect((mock.calls[0][1] as RequestInit).method).toBe('GET');
            expect(slug).toBe('test-post');
        });
    });

    it('includes the model id in the path when provided', async () => {
        await withMockFetch({json: {slugs: [{slug: 'test-post'}]}}, async (mock) => {
            const {result} = renderHookWithProviders(() => useGenerateSlug());

            await act(async () => {
                await result.current.generateSlug({type: 'post', text: 'Test post', modelId: 'post-1'});
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/slugs/post/Test%20post/post-1/');
        });
    });

    it('collapses whitespace so control characters never end up in the path', async () => {
        await withMockFetch({json: {slugs: [{slug: 'multi-line-title'}]}}, async (mock) => {
            const {result} = renderHookWithProviders(() => useGenerateSlug());

            await act(async () => {
                await result.current.generateSlug({type: 'post', text: '  Multi\nline\ttitle  '});
            });

            const url = new URL(mock.calls[0][0] as string);
            expect(url.pathname).toBe('/ghost/api/admin/slugs/post/Multi%20line%20title/');
        });
    });

    it('resolves to an empty string without a request when there is no text', async () => {
        await withMockFetch({json: {slugs: []}}, async (mock) => {
            const {result} = renderHookWithProviders(() => useGenerateSlug());

            let slug: string | undefined;

            await act(async () => {
                slug = await result.current.generateSlug({type: 'post', text: ''});
            });

            expect(slug).toBe('');
            expect(mock.calls).toHaveLength(0);
        });
    });
});
