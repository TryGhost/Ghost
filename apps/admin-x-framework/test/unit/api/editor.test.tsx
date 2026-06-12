import {act, waitFor} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {
    EDITOR_POST_FORMATS,
    EDITOR_POST_INCLUDES,
    getEditorPage,
    getEditorPost,
    useAddEditorPost,
    useEditEditorPost
} from '../../../src/api/editor';
import type {EditorPagesResponseType, EditorPostsResponseType, FullPost} from '../../../src/api/editor';
import {currentUserQueryKey} from '../../../src/api/current-user';
import {UpdateCollisionError} from '../../../src/utils/errors';
import {createTestQueryClient, renderHookWithProviders} from '../../../src/test/test-utils';
import {withMockFetch} from '../../utils/mock-fetch';

// Queries subscribe to the current user (for permission checks), so seed it
// to keep the mocked fetch calls limited to the requests under test
function createQueryClientWithCurrentUser() {
    const queryClient = createTestQueryClient();

    queryClient.setQueryDefaults(currentUserQueryKey, {staleTime: Infinity});
    queryClient.setQueryData(currentUserQueryKey, {
        users: [{
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            roles: []
        }]
    });

    return queryClient;
}

const fullPost = (overrides: Partial<FullPost> = {}): FullPost => ({
    id: 'post-1',
    uuid: 'uuid-1',
    title: 'Test post',
    slug: 'test-post',
    lexical: '{"root":{}}',
    mobiledoc: null,
    status: 'draft',
    visibility: 'public',
    custom_excerpt: null,
    feature_image: null,
    feature_image_alt: null,
    feature_image_caption: null,
    featured: false,
    published_at: null,
    updated_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    custom_template: null,
    canonical_url: null,
    codeinjection_head: null,
    codeinjection_foot: null,
    og_image: null,
    og_title: null,
    og_description: null,
    twitter_image: null,
    twitter_title: null,
    twitter_description: null,
    meta_title: null,
    meta_description: null,
    ...overrides
});

const collisionResponse = {
    errors: [{
        code: null,
        context: null,
        details: null,
        ghostErrorCode: null,
        help: '',
        id: 'error-1',
        message: 'Saving failed! Someone else is editing this post.',
        property: null,
        type: 'UpdateCollisionError'
    }]
};

function requestedUrl(mock: {calls: unknown[][]}, callIndex = 0): URL {
    return new URL(mock.calls[callIndex][0] as string);
}

function requestInit(mock: {calls: unknown[][]}, callIndex = 0): RequestInit {
    return mock.calls[callIndex][1] as RequestInit;
}

describe('editor api', () => {
    describe('getEditorPost', () => {
        it('requests the full post with editor formats and includes', async () => {
            const response: EditorPostsResponseType = {posts: [fullPost()]};

            await withMockFetch({json: response}, async (mock) => {
                const {result} = renderHookWithProviders(() => getEditorPost('post-1'), {
                    queryClient: createQueryClientWithCurrentUser()
                });

                await waitFor(() => {
                    expect(result.current.isSuccess).toBe(true);
                });

                const url = requestedUrl(mock);
                expect(url.pathname).toBe('/ghost/api/admin/posts/post-1/');
                expect(url.searchParams.get('formats')).toBe(EDITOR_POST_FORMATS);
                expect(url.searchParams.get('include')).toBe('tags,authors,authors.roles,email,tiers,newsletter,count.clicks,post_revisions,post_revisions.author');
                expect(requestInit(mock).method).toBe('GET');
                expect(result.current.data).toEqual(response);
            });
        });
    });

    describe('getEditorPage', () => {
        it('requests the full page with editor formats and includes', async () => {
            const response: EditorPagesResponseType = {pages: [fullPost({id: 'page-1'})]};

            await withMockFetch({json: response}, async (mock) => {
                const {result} = renderHookWithProviders(() => getEditorPage('page-1'), {
                    queryClient: createQueryClientWithCurrentUser()
                });

                await waitFor(() => {
                    expect(result.current.isSuccess).toBe(true);
                });

                const url = requestedUrl(mock);
                expect(url.pathname).toBe('/ghost/api/admin/pages/page-1/');
                expect(url.searchParams.get('formats')).toBe(EDITOR_POST_FORMATS);
                expect(url.searchParams.get('include')).toBe(EDITOR_POST_INCLUDES);
                expect(result.current.data).toEqual(response);
            });
        });
    });

    describe('useAddEditorPost', () => {
        it('POSTs a draft post with editor formats and includes', async () => {
            await withMockFetch({json: {posts: [fullPost()]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useAddEditorPost());

                await act(async () => {
                    await result.current.mutateAsync({post: {title: 'Test post', lexical: '{"root":{}}'}});
                });

                const url = requestedUrl(mock);
                expect(url.pathname).toBe('/ghost/api/admin/posts/');
                expect(url.searchParams.get('formats')).toBe(EDITOR_POST_FORMATS);
                expect(url.searchParams.get('include')).toBe(EDITOR_POST_INCLUDES);

                const init = requestInit(mock);
                expect(init.method).toBe('POST');
                expect(JSON.parse(init.body as string)).toEqual({posts: [{title: 'Test post', lexical: '{"root":{}}'}]});
            });
        });

        it('POSTs to the pages endpoint when the resource is pages', async () => {
            await withMockFetch({json: {pages: [fullPost({id: 'page-1'})]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useAddEditorPost());

                await act(async () => {
                    await result.current.mutateAsync({post: {title: 'Test page'}, resource: 'pages'});
                });

                expect(requestedUrl(mock).pathname).toBe('/ghost/api/admin/pages/');
                expect(JSON.parse(requestInit(mock).body as string)).toEqual({pages: [{title: 'Test page'}]});
            });
        });
    });

    describe('useEditEditorPost', () => {
        it('PUTs the post with updated_at in the body for collision detection', async () => {
            await withMockFetch({json: {posts: [fullPost()]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useEditEditorPost());

                await act(async () => {
                    await result.current.mutateAsync({
                        id: 'post-1',
                        post: {title: 'Updated title', updated_at: '2026-01-01T00:00:00.000Z'}
                    });
                });

                const url = requestedUrl(mock);
                expect(url.pathname).toBe('/ghost/api/admin/posts/post-1/');
                expect(url.searchParams.get('formats')).toBe(EDITOR_POST_FORMATS);
                expect(url.searchParams.get('include')).toBe(EDITOR_POST_INCLUDES);

                const init = requestInit(mock);
                expect(init.method).toBe('PUT');
                expect(JSON.parse(init.body as string)).toEqual({
                    posts: [{title: 'Updated title', updated_at: '2026-01-01T00:00:00.000Z'}]
                });
            });
        });

        it('PUTs to the pages endpoint when the resource is pages', async () => {
            await withMockFetch({json: {pages: [fullPost({id: 'page-1'})]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useEditEditorPost());

                await act(async () => {
                    await result.current.mutateAsync({
                        id: 'page-1',
                        post: {title: 'Updated page', updated_at: '2026-01-01T00:00:00.000Z'},
                        resource: 'pages'
                    });
                });

                expect(requestedUrl(mock).pathname).toBe('/ghost/api/admin/pages/page-1/');
                expect(JSON.parse(requestInit(mock).body as string)).toEqual({
                    pages: [{title: 'Updated page', updated_at: '2026-01-01T00:00:00.000Z'}]
                });
            });
        });

        it('appends newsletter and email_segment query params on email sends', async () => {
            await withMockFetch({json: {posts: [fullPost()]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useEditEditorPost());

                await act(async () => {
                    await result.current.mutateAsync({
                        id: 'post-1',
                        post: {status: 'published', updated_at: '2026-01-01T00:00:00.000Z'},
                        newsletter: 'default-newsletter',
                        emailSegment: 'status:-free'
                    });
                });

                const url = requestedUrl(mock);
                expect(url.searchParams.get('newsletter')).toBe('default-newsletter');
                expect(url.searchParams.get('email_segment')).toBe('status:-free');
            });
        });

        it('collapses the everyone email segment to all, like the Ember adapter', async () => {
            await withMockFetch({json: {posts: [fullPost()]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useEditEditorPost());

                await act(async () => {
                    await result.current.mutateAsync({
                        id: 'post-1',
                        post: {status: 'published', updated_at: '2026-01-01T00:00:00.000Z'},
                        newsletter: 'default-newsletter',
                        emailSegment: 'status:free,status:-free'
                    });
                });

                expect(requestedUrl(mock).searchParams.get('email_segment')).toBe('all');
            });
        });

        it('omits email_segment without a newsletter', async () => {
            await withMockFetch({json: {posts: [fullPost()]}}, async (mock) => {
                const {result} = renderHookWithProviders(() => useEditEditorPost());

                await act(async () => {
                    await result.current.mutateAsync({
                        id: 'post-1',
                        post: {status: 'published', updated_at: '2026-01-01T00:00:00.000Z'},
                        emailSegment: 'status:-free'
                    });
                });

                const url = requestedUrl(mock);
                expect(url.searchParams.get('newsletter')).toBeNull();
                expect(url.searchParams.get('email_segment')).toBeNull();
            });
        });

        it('rejects with UpdateCollisionError on a 409 response', async () => {
            await withMockFetch({json: collisionResponse, status: 409, ok: false}, async () => {
                const {result} = renderHookWithProviders(() => useEditEditorPost());

                let error: unknown;

                await act(async () => {
                    try {
                        await result.current.mutateAsync({
                            id: 'post-1',
                            post: {title: 'Updated title', updated_at: '2020-01-01T00:00:00.000Z'}
                        });
                    } catch (e) {
                        error = e;
                    }
                });

                expect(error).toBeInstanceOf(UpdateCollisionError);
                expect((error as UpdateCollisionError).message).toBe('Saving failed! Someone else is editing this post.');
            });
        });

        it('invalidates the posts and pages list caches after saving', async () => {
            const queryClient = createTestQueryClient();

            for (const key of [['PostsResponseType', '/posts'], ['PagesResponseType', '/pages'], ['TagsResponseType', '/tags']]) {
                // prevent immediate garbage collection of the unused queries
                queryClient.setQueryDefaults(key, {cacheTime: Infinity});
            }

            queryClient.setQueryData(['PostsResponseType', '/posts'], {posts: []});
            queryClient.setQueryData(['PagesResponseType', '/pages'], {pages: []});
            queryClient.setQueryData(['TagsResponseType', '/tags'], {tags: []});

            await withMockFetch({json: {posts: [fullPost()]}}, async () => {
                const {result} = renderHookWithProviders(() => useEditEditorPost(), {queryClient});

                await act(async () => {
                    await result.current.mutateAsync({
                        id: 'post-1',
                        post: {title: 'Updated title', updated_at: '2026-01-01T00:00:00.000Z'}
                    });
                });

                const invalidatedKeys = queryClient.getQueryCache().getAll()
                    .filter(query => query.state.isInvalidated)
                    .map(query => query.queryKey[0]);

                expect(invalidatedKeys).toEqual(expect.arrayContaining(['PostsResponseType', 'PagesResponseType']));
                expect(invalidatedKeys).not.toContain('TagsResponseType');
            });
        });
    });
});
