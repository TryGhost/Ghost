/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createTestWrapper, mockApiHook, setupUniversalMocks} from '../../utils/test-helpers';
import {renderHook, waitFor} from '@testing-library/react';
import {responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

// Centralized API mocking
vi.mock('@tryghost/admin-x-framework/api/posts');
vi.mock('@tryghost/admin-x-framework/api/stats');
vi.mock('@tryghost/admin-x-framework/api/links');
vi.mock('@src/providers/PostAnalyticsContext');
vi.mock('@tryghost/admin-x-framework/api/settings');

describe('usePostNewsletterStats', () => {
    const testPostId = '64d623b64676110001e897d9';
    let wrapper: any;
    let mocks: any;
    
    beforeEach(async () => {
        vi.clearAllMocks();
        wrapper = createTestWrapper();
        
        // Universal setup - mocks ALL API hooks with sensible defaults
        mocks = await setupUniversalMocks();
    });

    it('calculates stats correctly from post data', async () => {
        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {wrapper});

        await waitFor(() => {
            expect(result.current.stats).toEqual({
                sent: 1000,
                opened: 300,
                clicked: 50,
                openedRate: 0.3,
                clickedRate: 0.05
            });
        });
    });

    it('returns default stats when post has no email data', async () => {
        const postWithoutEmail = {
            posts: [{
                id: testPostId,
                url: 'https://example.com/post',
                slug: 'test-post',
                title: 'Test Post',
                uuid: 'test-uuid',
                newsletter: {id: 'newsletter-123'}
                // No email or count data
            }]
        };

        mockApiHook(mocks.mockGetPost, postWithoutEmail);

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {wrapper});

        await waitFor(() => {
            expect(result.current.stats).toEqual({
                sent: 0,
                opened: 0,
                clicked: 0,
                openedRate: 0,
                clickedRate: 0
            });
        });
    });

    it('calculates average stats from newsletter data', async () => {
        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {wrapper});

        await waitFor(() => {
            // Based on the newsletter stats fixture, calculate expected averages
            const stats = responseFixtures.newsletterStats.stats;
            const avgOpenRate = stats.reduce((sum, s) => sum + s.open_rate, 0) / stats.length;
            const avgClickRate = stats.reduce((sum, s) => sum + s.click_rate, 0) / stats.length;
            
            expect(result.current.averageStats).toEqual({
                openedRate: Number(avgOpenRate.toFixed(2)),
                clickedRate: Number(avgClickRate.toFixed(2))
            });
        });
    });

    it('handles loading states correctly', async () => {
        mockApiHook(mocks.mockGetPost, undefined, true);

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {wrapper});

        expect(result.current.isLoading).toBe(true);
    });

    it('handles missing data gracefully', async () => {
        mockApiHook(mocks.mockGetPost, undefined);
        mockApiHook(mocks.mockUseNewsletterStatsByNewsletterId, undefined);
        mockApiHook(mocks.mockUseTopLinks, undefined);

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {wrapper});

        await waitFor(() => {
            expect(result.current.stats).toEqual({
                sent: 0,
                opened: 0,
                clicked: 0,
                openedRate: 0,
                clickedRate: 0
            });
            expect(result.current.averageStats).toEqual({
                openedRate: 0,
                clickedRate: 0
            });
            expect(result.current.topLinks).toEqual([]);
        });
    });

    it('provides refetch function for top links', async () => {
        const mockReturn = mockApiHook(mocks.mockUseTopLinks, undefined);
        const mockRefetch = vi.fn();
        mockReturn.refetch = mockRefetch;

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {wrapper});

        expect(result.current.refetchTopLinks).toBe(mockRefetch);
    });
});