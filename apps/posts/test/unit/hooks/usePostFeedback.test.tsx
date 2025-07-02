/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {usePostFeedback} from '@src/hooks/usePostFeedback';

// Mock the dependencies
vi.mock('@tryghost/admin-x-framework/api/feedback');

const mockGetPostFeedback = vi.mocked(await import('@tryghost/admin-x-framework/api/feedback')).getPostFeedback;

describe('usePostFeedback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty feedback array when no response', () => {
        mockGetPostFeedback.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostFeedback('post-123'));

        expect(result.current).toEqual({
            feedback: [],
            isLoading: false,
            error: null
        });
    });

    it('returns loading state when fetching feedback', () => {
        mockGetPostFeedback.mockReturnValue({
            data: null,
            isLoading: true,
            error: null
        } as any);

        const {result} = renderHook(() => usePostFeedback('post-123'));

        expect(result.current).toEqual({
            feedback: [],
            isLoading: true,
            error: null
        });
    });

    it('returns error state when fetch fails', () => {
        const mockError = new Error('Failed to fetch feedback');
        mockGetPostFeedback.mockReturnValue({
            data: null,
            isLoading: false,
            error: mockError
        } as any);

        const {result} = renderHook(() => usePostFeedback('post-123'));

        expect(result.current).toEqual({
            feedback: [],
            isLoading: false,
            error: mockError
        });
    });

    it('returns feedback data when successful', () => {
        const mockFeedback = [
            {id: '1', score: 1, message: 'Great post!'},
            {id: '2', score: 0, message: 'Not helpful'}
        ];

        mockGetPostFeedback.mockReturnValue({
            data: {feedback: mockFeedback},
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostFeedback('post-123'));

        expect(result.current).toEqual({
            feedback: mockFeedback,
            isLoading: false,
            error: null
        });
    });

    it('calls getPostFeedback with correct parameters', () => {
        mockGetPostFeedback.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        renderHook(() => usePostFeedback('post-123'));

        expect(mockGetPostFeedback).toHaveBeenCalledWith('post-123', {
            searchParams: {
                limit: '50'
            }
        });
    });

    it('includes score filter when score is provided', () => {
        mockGetPostFeedback.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        renderHook(() => usePostFeedback('post-123', 1));

        expect(mockGetPostFeedback).toHaveBeenCalledWith('post-123', {
            searchParams: {
                limit: '50',
                score: '1'
            }
        });
    });

    it('includes score filter for negative scores', () => {
        mockGetPostFeedback.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        renderHook(() => usePostFeedback('post-123', 0));

        expect(mockGetPostFeedback).toHaveBeenCalledWith('post-123', {
            searchParams: {
                limit: '50',
                score: '0'
            }
        });
    });

    it('does not include score filter when score is undefined', () => {
        mockGetPostFeedback.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        renderHook(() => usePostFeedback('post-123', undefined));

        expect(mockGetPostFeedback).toHaveBeenCalledWith('post-123', {
            searchParams: {
                limit: '50'
            }
        });
    });

    it('memoizes feedback array correctly', () => {
        const mockFeedback = [
            {id: '1', score: 1, message: 'Great post!'}
        ];

        mockGetPostFeedback.mockReturnValue({
            data: {feedback: mockFeedback},
            isLoading: false,
            error: null
        } as any);

        const {result, rerender} = renderHook(() => usePostFeedback('post-123'));

        const firstFeedback = result.current.feedback;
        
        // Rerender with same data
        rerender();
        
        // Should return the same array reference due to memoization
        expect(result.current.feedback).toBe(firstFeedback);
    });

    it('updates feedback when response changes', () => {
        const initialFeedback = [{id: '1', score: 1, message: 'Great!'}];
        const updatedFeedback = [{id: '2', score: 0, message: 'Not helpful'}];

        mockGetPostFeedback.mockReturnValue({
            data: {feedback: initialFeedback},
            isLoading: false,
            error: null
        } as any);

        const {result, rerender} = renderHook(() => usePostFeedback('post-123'));

        expect(result.current.feedback).toEqual(initialFeedback);

        // Update mock to return different data
        mockGetPostFeedback.mockReturnValue({
            data: {feedback: updatedFeedback},
            isLoading: false,
            error: null
        } as any);

        rerender();

        expect(result.current.feedback).toEqual(updatedFeedback);
    });

    it('handles empty feedback response', () => {
        mockGetPostFeedback.mockReturnValue({
            data: {feedback: []},
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostFeedback('post-123'));

        expect(result.current.feedback).toEqual([]);
    });

    it('handles response with undefined feedback', () => {
        mockGetPostFeedback.mockReturnValue({
            data: {feedback: undefined},
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostFeedback('post-123'));

        expect(result.current.feedback).toEqual([]);
    });

    it('handles response with null feedback', () => {
        mockGetPostFeedback.mockReturnValue({
            data: {feedback: null},
            isLoading: false,
            error: null
        } as any);

        const {result} = renderHook(() => usePostFeedback('post-123'));

        expect(result.current.feedback).toEqual([]);
    });

    it('works with different post IDs', () => {
        mockGetPostFeedback.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        const {rerender} = renderHook(
            ({postId}) => usePostFeedback(postId),
            {initialProps: {postId: 'post-123'}}
        );

        expect(mockGetPostFeedback).toHaveBeenCalledWith('post-123', expect.any(Object));

        rerender({postId: 'post-456'});

        expect(mockGetPostFeedback).toHaveBeenCalledWith('post-456', expect.any(Object));
    });

    it('works with changing score filters', () => {
        mockGetPostFeedback.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        const {rerender} = renderHook(
            ({score}) => usePostFeedback('post-123', score),
            {initialProps: {score: undefined as number | undefined}}
        );

        expect(mockGetPostFeedback).toHaveBeenCalledWith('post-123', {
            searchParams: {limit: '50'}
        });

        rerender({score: 1});

        expect(mockGetPostFeedback).toHaveBeenCalledWith('post-123', {
            searchParams: {limit: '50', score: '1'}
        });

        rerender({score: 0});

        expect(mockGetPostFeedback).toHaveBeenCalledWith('post-123', {
            searchParams: {limit: '50', score: '0'}
        });
    });
});