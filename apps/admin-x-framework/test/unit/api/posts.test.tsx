import {act, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {createTestQueryClient, renderHookWithProviders} from '../../../src/test/test-utils';
import {type Post, type PostsResponseType, useAddPost} from '../../../src/api/posts';
import {withMockFetch} from '../../utils/mock-fetch';

function postsResponse(posts: Partial<Post>[] = []): PostsResponseType {
    return {
        posts: posts as Post[]
    };
}

describe('posts api', () => {
    it('creates posts and updates the posts query cache', async () => {
        const queryClient = createTestQueryClient();
        const onUpdate = vi.fn();
        const postsQueryKey = ['PostsResponseType', 'http://localhost:3000/ghost/api/admin/posts/'];
        const post: Partial<Post> = {
            authors: [{id: 'user-1'}],
            lexical: '{"root":{"children":[],"type":"root","version":1}}',
            post_revisions: [],
            slug: 'restored-post',
            status: 'draft',
            tags: [],
            title: '(Restored) Lost post',
            type: 'post'
        };
        const createdPost = {
            ...post,
            id: 'post-1',
            url: 'https://example.com/restored-post/',
            uuid: 'post-uuid'
        };

        queryClient.setQueryData(postsQueryKey, postsResponse());

        await withMockFetch({
            json: postsResponse([createdPost])
        }, async (mockFetch) => {
            const {result} = renderHookWithProviders(() => useAddPost(), {
                frameworkProps: {onUpdate},
                queryClient
            });

            await act(async () => {
                await result.current.mutateAsync(post);
            });

            expect(mockFetch.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/posts/');
            expect(mockFetch.calls[0][1].method).toBe('POST');
            expect(mockFetch.calls[0][1].body).toBe(JSON.stringify({posts: [post]}));

            await waitFor(() => {
                expect(queryClient.getQueryData<PostsResponseType>(postsQueryKey)?.posts).toEqual([createdPost]);
            });
            expect(onUpdate).toHaveBeenCalledWith('PostsResponseType', postsResponse([createdPost]));
        });
    });
});
