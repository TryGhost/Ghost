/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it} from 'vitest';
import {createTestWrapper, endpoint, mockServer, when} from '../../utils/msw-helpers';
import {renderHook, waitFor} from '@testing-library/react';
import {usePostFeedback} from '@src/hooks/usePostFeedback';

describe('usePostFeedback', () => {
    const testPostId = 'post-123';
    
    beforeEach(() => {
        mockServer.setup(); // Basic setup with defaults
    });

    it('returns empty feedback array when no feedback exists', async () => {
        mockServer.setup({
            feedback: []
        });

        const {result} = renderHook(() => usePostFeedback(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.feedback).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    it('returns feedback data when successful', async () => {
        const mockFeedback = [
            {id: '1', score: 1},
            {id: '2', score: 0}
        ];

        mockServer.setup({
            feedback: mockFeedback
        });

        const {result} = renderHook(() => usePostFeedback(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.feedback).toHaveLength(2);
            expect(result.current.feedback[0]).toMatchObject({id: '1', score: 1});
            expect(result.current.feedback[1]).toMatchObject({id: '2', score: 0});
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    it('handles positive feedback filter', async () => {
        mockServer.setup({
            feedback: [
                {id: '1', score: 1},
                {id: '3', score: 1}
            ]
        });

        const {result} = renderHook(() => usePostFeedback(testPostId, 1), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.feedback).toHaveLength(2);
            expect(result.current.feedback[0]).toMatchObject({id: '1', score: 1});
            expect(result.current.feedback[1]).toMatchObject({id: '3', score: 1});
        });
    });

    it('handles negative feedback filter', async () => {
        const negativeFeedback = [{id: '2', score: 0, message: 'Not helpful'}];

        mockServer.setup({
            customHandlers: [
                when('get', '/ghost/api/admin/feedback/*', [
                    {
                        if: (req: Request) => new URL(req.url).searchParams.get('score') === '0',
                        response: {feedback: negativeFeedback}
                    }
                ], {feedback: []})
            ]
        });

        const {result} = renderHook(() => usePostFeedback(testPostId, 0), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.feedback).toEqual(negativeFeedback);
        });
    });

    it('handles server errors gracefully', async () => {
        mockServer.setup({
            customHandlers: [
                endpoint.get('/ghost/api/admin/feedback/*', {error: 'Server error'}, 500)
            ]
        });

        const {result} = renderHook(() => usePostFeedback(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.feedback).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeDefined();
        });
    });
});