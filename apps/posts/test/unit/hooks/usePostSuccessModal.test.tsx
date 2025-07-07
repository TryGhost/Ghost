/* eslint-disable @typescript-eslint/no-explicit-any */
import {HttpResponse, http} from 'msw';
import {act, renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createTestWrapper, mockData, mockServer} from '../../utils/msw-helpers';
import {usePostSuccessModal} from '@src/hooks/usePostSuccessModal';

// Mock React context (not HTTP)
vi.mock('@src/providers/PostAnalyticsContext');
const mockUseGlobalData = vi.mocked(await import('@src/providers/PostAnalyticsContext')).useGlobalData;

// Mock localStorage
const mockLocalStorage = {
    getItem: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
});

describe('usePostSuccessModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default mocks
        mockUseGlobalData.mockReturnValue({
            site: {
                title: 'Test Site',
                icon: 'https://example.com/icon.png'
            }
        } as any);

        mockLocalStorage.getItem.mockReturnValue(null);
        
        // Default MSW setup - no posts data by default
        mockServer.setup({
            posts: []
        });
    });

    it('initializes with modal closed and no data', () => {
        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        expect(result.current.isModalOpen).toBe(false);
        expect(result.current.post).toBeUndefined();
        expect(result.current.postCount).toBe(null);
        expect(result.current.showPostCount).toBe(false);
        expect(result.current.modalProps).toBe(null);
    });

    it('does not open modal when localStorage is empty', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        expect(result.current.isModalOpen).toBe(false);
    });

    it('handles invalid JSON in localStorage gracefully', () => {
        mockLocalStorage.getItem.mockReturnValue('invalid json');

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        expect(result.current.isModalOpen).toBe(false);
    });

    it('ignores localStorage errors gracefully', () => {
        mockLocalStorage.getItem.mockImplementation(() => {
            throw new Error('LocalStorage error');
        });

        expect(() => {
            renderHook(() => usePostSuccessModal(), {
                wrapper: createTestWrapper()
            });
        }).not.toThrow();
    });

    it('creates modal props when post data is available', async () => {
        const testPost = mockData.post({
            id: 'post-123',
            title: 'Test Post',
            url: 'https://example.com/test-post',
            feature_image: 'https://example.com/image.jpg',
            published_at: '2023-12-01T12:00:00Z',
            authors: [{name: 'John Doe'}],
            email: {email_count: 100, opened_count: 30},
            newsletter: {name: 'Weekly Newsletter'}
        } as any);

        // Set up MSW to return the post data
        mockServer.setup({
            posts: [testPost]
        });

        // Simulate localStorage containing published post data
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.post).toEqual(testPost);
            expect(result.current.isModalOpen).toBe(true);
        });
    });

    it('opens modal when localStorage contains valid post data', async () => {
        const testPost = mockData.post({
            id: 'post-123',
            title: 'Published Post'
        });

        mockServer.setup({
            posts: [testPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.isModalOpen).toBe(true);
        });
    });

    it('cleans up localStorage when modal opens', async () => {
        const testPost = mockData.post({
            id: 'post-123',
            title: 'Test Post'
        });

        mockServer.setup({
            posts: [testPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        // Wait for the modal to open (localStorage data consumed)
        await waitFor(() => {
            expect(result.current.isModalOpen).toBe(true);
        });

        // Behavior test: localStorage data should be consumed and not trigger again
        // Clear the localStorage mock and verify subsequent renders don't trigger
        mockLocalStorage.getItem.mockReturnValue(null);
        
        // Close modal - should close properly
        act(() => {
            result.current.closeModal();
        });
        
        expect(result.current.isModalOpen).toBe(false);
    });

    it('handles post count response', async () => {
        // Setup MSW with custom handlers for count endpoint
        mockServer.setup({
            customHandlers: [
                http.get('/ghost/api/admin/posts/*', ({request}) => {
                    const url = new URL(request.url);
                    const fields = url.searchParams.get('fields');
                    
                    if (fields === 'id') {
                        // Post count endpoint
                        return HttpResponse.json({
                            meta: {
                                pagination: {
                                    total: 42
                                }
                            }
                        });
                    }
                    
                    // Regular post data endpoint
                    return HttpResponse.json({posts: []});
                })
            ]
        });

        // Simulate localStorage containing published post data
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.postCount).toBe(42);
            expect(result.current.showPostCount).toBe(true);
        });
    });

    it('closes modal correctly', () => {
        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        result.current.closeModal();

        expect(result.current.isModalOpen).toBe(false);
        expect(result.current.postCount).toBe(null);
    });

    it('handles email-only posts', async () => {
        const testPost = mockData.post({
            id: 'post-123',
            title: 'Email Only Post',
            email_only: true,
            email: {email_count: 50, opened_count: 15}
        } as any);

        mockServer.setup({
            posts: [testPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.post?.email_only).toBe(true);
        });
    });

    it('handles multiple authors', async () => {
        const testPost = mockData.post({
            id: 'post-123',
            title: 'Test Post',
            authors: [
                {name: 'John Doe'},
                {name: 'Jane Smith'},
                {name: 'Bob Johnson'}
            ]
        } as any);

        mockServer.setup({
            posts: [testPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.post?.authors).toHaveLength(3);
        });
    });

    it('handles posts without authors', async () => {
        const testPost = mockData.post({
            id: 'post-123',
            title: 'Test Post'
        });

        mockServer.setup({
            posts: [testPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.post?.authors).toBeUndefined();
        });
    });

    it('creates modal props with correct email data for different subscriber counts', async () => {
        // Test single subscriber - behavior: modal props should be created
        const singleSubscriberPost = mockData.post({
            id: 'post-123',
            title: 'Single Subscriber Post',
            email: {email_count: 1, opened_count: 0},
            newsletter: {name: 'Test Newsletter'}
        } as any);

        mockServer.setup({
            posts: [singleSubscriberPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result: singleResult} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(singleResult.current.modalProps).toBeTruthy();
            expect(singleResult.current.modalProps?.emailOnly).toBeFalsy();
            expect(singleResult.current.modalProps?.description).toBeTruthy();
        });

        // Test multiple subscribers - behavior: modal props should be created
        const multipleSubscribersPost = mockData.post({
            id: 'post-456',
            title: 'Multiple Subscribers Post', 
            email: {email_count: 100, opened_count: 30},
            newsletter: {name: 'Test Newsletter'}
        } as any);

        mockServer.setup({
            posts: [multipleSubscribersPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-456',
            type: 'post'
        }));

        const {result: multipleResult} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(multipleResult.current.modalProps).toBeTruthy();
            expect(multipleResult.current.modalProps?.emailOnly).toBeFalsy();
            expect(multipleResult.current.modalProps?.description).toBeTruthy();
        });
    });

    it('creates appropriate modal props for different post types', async () => {
        // Test email-only post - behavior: should set emailOnly flag
        const emailOnlyPost = mockData.post({
            id: 'email-post',
            title: 'Email Only Post',
            email_only: true,
            email: {email_count: 50, opened_count: 15}
        } as any);

        mockServer.setup({
            posts: [emailOnlyPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'email-post',
            type: 'post'
        }));

        const {result: emailResult} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(emailResult.current.modalProps?.emailOnly).toBe(true);
            expect(emailResult.current.modalProps?.description).toBeTruthy();
        });

        // Test published post with email - behavior: should not be emailOnly
        const publishedPost = mockData.post({
            id: 'published-post',
            title: 'Published Post',
            email: {email_count: 100, opened_count: 30}
        } as any);

        mockServer.setup({
            posts: [publishedPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'published-post',
            type: 'post'
        }));

        const {result: publishedResult} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(publishedResult.current.modalProps?.emailOnly).toBeFalsy();
            expect(publishedResult.current.modalProps?.description).toBeTruthy();
        });

        // Test published post without email - behavior: should not be emailOnly
        const publishedOnlyPost = mockData.post({
            id: 'published-only',
            title: 'Published Only Post'
        });

        mockServer.setup({
            posts: [publishedOnlyPost]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'published-only',
            type: 'post'
        }));

        const {result: publishedOnlyResult} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(publishedOnlyResult.current.modalProps?.emailOnly).toBeFalsy();
            expect(publishedOnlyResult.current.modalProps?.description).toBeTruthy();
        });
    });

    it('handles loading state', () => {
        // Without localStorage data, no API calls are made
        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        expect(result.current.post).toBeUndefined();
    });

    it('handles error state', () => {
        // Test when MSW server returns an error
        mockServer.setup({
            customHandlers: [
                http.get('/ghost/api/admin/posts/*', () => {
                    return HttpResponse.json({error: 'API Error'}, {status: 500});
                })
            ]
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        expect(result.current.post).toBeUndefined();
    });

    it('handles empty posts response', async () => {
        mockServer.setup({
            posts: [] // Empty posts array
        });

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
            id: 'post-123',
            type: 'post'
        }));

        const {result} = renderHook(() => usePostSuccessModal(), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.post).toBeUndefined();
        });
    });
});