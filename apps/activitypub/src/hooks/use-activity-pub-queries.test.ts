import React from 'react';
import {ActivityPubAPI, isApiError} from '../api/activitypub';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useDeleteMutationForUser, useReplyChainForUser} from './use-activity-pub-queries';

globalThis.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({
        site: {url: 'https://test.com'}
    })
});

vi.mock('../api/activitypub', () => ({
    ActivityPubAPI: vi.fn(),
    isApiError: vi.fn()
}));

const createQueryClient = () => {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            },
            mutations: {
                retry: false
            }
        }
    });
};

const createWrapper = (queryClient = createQueryClient()) => {
    return function TestWrapper({children}: {children: React.ReactNode}) {
        return React.createElement(QueryClientProvider, {client: queryClient}, children);
    };
};

let mockApi: {
    delete: ReturnType<typeof vi.fn>;
    getReplies: ReturnType<typeof vi.fn>;
    getPost: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
    vi.clearAllMocks();

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: vi.fn().mockResolvedValue({
            site: {url: 'https://test.com'}
        })
    });

    mockApi = {
        delete: vi.fn(),
        getReplies: vi.fn(),
        getPost: vi.fn()
    };

    (ActivityPubAPI as ReturnType<typeof vi.fn>).mockImplementation(function () {
        return mockApi;
    });
    (isApiError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
});

describe('useReplyChainForUser', () => {
    it('should retry with getPost when getReplies returns 404', async () => {
        const mockReplyChain = {
            ancestors: {chain: [], hasMore: false},
            focus: {id: 'post-1', content: 'Test'},
            descendants: {chain: [], hasMore: false},
            next: null
        };
        
        const apiError = {message: 'Not found', statusCode: 404};
        
        mockApi.getReplies
            .mockRejectedValueOnce(apiError)
            .mockResolvedValueOnce(mockReplyChain);
        mockApi.getPost.mockResolvedValue({id: 'post-1'});
        
        const {result} = renderHook(
            () => useReplyChainForUser('test-handle', 'post-1'),
            {wrapper: createWrapper()}
        );
        
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
        
        await waitFor(() => {
            expect(result.current.data).toEqual(mockReplyChain);
        });
        
        expect(mockApi.getReplies).toHaveBeenCalledTimes(2);
        expect(mockApi.getPost).toHaveBeenCalledTimes(1);
        expect(mockApi.getPost).toHaveBeenCalledWith('post-1');
    });
});

describe('useDeleteMutationForUser', () => {
    it('restores each profile posts cache when deletion fails', async () => {
        const queryClient = createQueryClient();
        const firstQueryKey = ['profile_posts', 'first'];
        const secondQueryKey = ['profile_posts', 'second'];
        const firstData = {pages: [{posts: [{id: 'deleted', object: {id: 'deleted'}}]}]};
        const secondData = {pages: [{posts: [{id: 'other', object: {id: 'other'}}]}]};

        queryClient.setQueryData(firstQueryKey, firstData);
        queryClient.setQueryData(secondQueryKey, secondData);
        mockApi.delete.mockRejectedValue(new Error('Delete failed'));

        const {result} = renderHook(
            () => useDeleteMutationForUser('index'),
            {wrapper: createWrapper(queryClient)}
        );

        await act(async () => {
            await expect(result.current.mutateAsync({id: 'deleted'})).rejects.toThrow('Delete failed');
        });

        expect(queryClient.getQueryData(firstQueryKey)).toEqual(firstData);
        expect(queryClient.getQueryData(secondQueryKey)).toEqual(secondData);
    });
});
