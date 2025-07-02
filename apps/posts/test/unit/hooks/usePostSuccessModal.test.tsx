/* eslint-disable @typescript-eslint/no-explicit-any */
import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {usePostSuccessModal} from '@src/hooks/usePostSuccessModal';

// Mock the dependencies
vi.mock('@tryghost/admin-x-framework/api/posts');
vi.mock('@src/providers/PostAnalyticsContext');

const mockUseBrowsePosts = vi.mocked(await import('@tryghost/admin-x-framework/api/posts')).useBrowsePosts;
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

        mockUseBrowsePosts.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        mockLocalStorage.getItem.mockReturnValue(null);
    });

    it('initializes with modal closed and no data', () => {
        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.isModalOpen).toBe(false);
        expect(result.current.post).toBeUndefined();
        expect(result.current.postCount).toBe(null);
        expect(result.current.showPostCount).toBe(false);
        expect(result.current.modalProps).toBe(null);
    });

    it('checks localStorage on mount', () => {
        renderHook(() => usePostSuccessModal());
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('ghost-last-published-post');
    });

    it('does not open modal when localStorage is empty', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.isModalOpen).toBe(false);
    });

    it('handles invalid JSON in localStorage gracefully', () => {
        mockLocalStorage.getItem.mockReturnValue('invalid json');

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.isModalOpen).toBe(false);
    });

    it('ignores localStorage errors gracefully', () => {
        mockLocalStorage.getItem.mockImplementation(() => {
            throw new Error('LocalStorage error');
        });

        expect(() => {
            renderHook(() => usePostSuccessModal());
        }).not.toThrow();
    });

    it('fetches posts when enabled', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        renderHook(() => usePostSuccessModal());

        // Should call useBrowsePosts with enabled: false initially
        expect(mockUseBrowsePosts).toHaveBeenCalledWith({
            searchParams: {},
            enabled: false
        });

        expect(mockUseBrowsePosts).toHaveBeenCalledWith({
            searchParams: {
                filter: 'status:[published,sent]',
                limit: '1',
                fields: 'id'
            },
            enabled: false
        });
    });

    it('creates modal props when post data is available', () => {
        const mockPost = {
            id: 'post-123',
            title: 'Test Post',
            excerpt: 'This is a test post excerpt',
            url: 'https://example.com/test-post',
            feature_image: 'https://example.com/image.jpg',
            published_at: '2023-12-01T12:00:00Z',
            authors: [{name: 'John Doe'}],
            email: {email_count: 100},
            newsletter: {name: 'Weekly Newsletter'}
        };

        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.post).toEqual(mockPost);
    });

    it('handles post count response', () => {
        mockUseBrowsePosts.mockImplementation(({searchParams}: any) => {
            if (searchParams?.fields === 'id') {
                return {
                    data: {
                        meta: {
                            pagination: {
                                total: 42
                            }
                        }
                    },
                    isLoading: false,
                    error: null
                } as any;
            }
            return {
                data: null,
                isLoading: false,
                error: null
            } as any;
        });

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.postCount).toBe(42);
        expect(result.current.showPostCount).toBe(true);
    });

    it('closes modal correctly', () => {
        const {result} = renderHook(() => usePostSuccessModal());

        result.current.closeModal();

        expect(result.current.isModalOpen).toBe(false);
        expect(result.current.postCount).toBe(null);
    });

    it('handles email-only posts', () => {
        const mockPost = {
            id: 'post-123',
            title: 'Email Only Post',
            email_only: true,
            email: {email_count: 50}
        };

        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.post?.email_only).toBe(true);
    });

    it('handles multiple authors', () => {
        const mockPost = {
            id: 'post-123',
            title: 'Test Post',
            authors: [
                {name: 'John Doe'},
                {name: 'Jane Smith'},
                {name: 'Bob Johnson'}
            ]
        };

        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.post?.authors).toHaveLength(3);
    });

    it('handles posts without authors', () => {
        const mockPost = {
            id: 'post-123',
            title: 'Test Post'
        };

        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.post?.authors).toBeUndefined();
    });

    it('handles loading state', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: null,
            isLoading: true,
            error: null
        } as any);

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.post).toBeUndefined();
    });

    it('handles error state', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: null,
            isLoading: false,
            error: new Error('API Error')
        } as any);

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.post).toBeUndefined();
    });

    it('handles empty posts response', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: []},
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current.post).toBeUndefined();
    });

    it('provides correct modal properties structure', () => {
        const {result} = renderHook(() => usePostSuccessModal());

        expect(result.current).toHaveProperty('isModalOpen');
        expect(result.current).toHaveProperty('post');
        expect(result.current).toHaveProperty('postCount');
        expect(result.current).toHaveProperty('showPostCount');
        expect(result.current).toHaveProperty('closeModal');
        expect(result.current).toHaveProperty('modalProps');
        
        expect(typeof result.current.isModalOpen).toBe('boolean');
        expect(typeof result.current.showPostCount).toBe('boolean');
        expect(typeof result.current.closeModal).toBe('function');
    });
});