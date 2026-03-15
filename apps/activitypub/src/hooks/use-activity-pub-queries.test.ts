import React from 'react';
import {ActivityPubAPI, isApiError} from '../api/activitypub';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useReplyChainForUser} from './use-activity-pub-queries';

global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({
        site: {url: 'https://test.com'}
    })
});

vi.mock('../api/activitypub', () => ({
    ActivityPubAPI: vi.fn(),
    isApiError: vi.fn()
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });
    
    return function TestWrapper({children}: {children: React.ReactNode}) {
        return React.createElement(QueryClientProvider, {client: queryClient}, children);
    };
};

describe('useReplyChainForUser', () => {
    let mockApi: {
        getReplies: ReturnType<typeof vi.fn>;
        getPost: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            json: vi.fn().mockResolvedValue({
                site: {url: 'https://test.com'}
            })
        });
        
        mockApi = {
            getReplies: vi.fn(),
            getPost: vi.fn()
        };
        
        (ActivityPubAPI as ReturnType<typeof vi.fn>).mockImplementation(() => mockApi);
        (isApiError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

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
