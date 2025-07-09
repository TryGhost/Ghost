/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it} from 'vitest';
import {createTestWrapper, mockData, mockServer} from '../../utils/msw-helpers';
import {renderHook, waitFor} from '@testing-library/react';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

describe('usePostNewsletterStats', () => {
    const testPostId = 'test-post-id';
    
    beforeEach(() => {
        mockServer.setup(); // Basic setup with defaults
    });

    it('calculates stats correctly from post email data', async () => {
        const postWithEmailStats = mockData.post({
            id: testPostId,
            email: {
                email_count: 1000,
                opened_count: 300
            },
            count: {
                clicks: 50
            }
        });

        mockServer.setup({
            posts: [postWithEmailStats]
        });

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.stats).toEqual({
                sent: 1000,
                opened: 300,
                clicked: 50,
                openedRate: 0.3, // 300/1000
                clickedRate: 0.05 // 50/1000
            });
        });
    });

    it('returns zero stats when post has no email data', async () => {
        const postWithoutEmail = mockData.post({
            id: testPostId
            // No email or count data
        });

        mockServer.setup({
            posts: [postWithoutEmail]
        });

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {
            wrapper: createTestWrapper()
        });

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

    it('calculates average newsletter performance correctly', async () => {
        const newsletterStats = [
            {post_id: 'post1', open_rate: 0.25, click_rate: 0.03},
            {post_id: 'post2', open_rate: 0.35, click_rate: 0.07},
            {post_id: 'post3', open_rate: 0.30, click_rate: 0.05}
        ];

        mockServer.setup({
            posts: [mockData.post({id: testPostId})],
            newsletterBasicStats: newsletterStats,
            newsletterClickStats: newsletterStats
        });

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            // Average: (0.25 + 0.35 + 0.30) / 3 = 0.30
            // Average: (0.03 + 0.07 + 0.05) / 3 = 0.05
            expect(result.current.averageStats).toEqual({
                openedRate: 0.30,
                clickedRate: 0.05
            });
        });
    });

    it('prevents division by zero in rate calculations', async () => {
        const postWithClicksButNoEmails = mockData.post({
            id: testPostId,
            email: {
                email_count: 0,
                opened_count: 5 // Impossible but testing edge case
            },
            count: {
                clicks: 10
            }
        });

        mockServer.setup({
            posts: [postWithClicksButNoEmails]
        });

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.stats.openedRate).toBe(0);
            expect(result.current.stats.clickedRate).toBe(0);
            expect(Number.isNaN(result.current.stats.openedRate)).toBe(false);
            expect(Number.isNaN(result.current.stats.clickedRate)).toBe(false);
        });
    });

    it('handles missing newsletter comparison data gracefully', async () => {
        mockServer.setup({
            posts: [mockData.post({id: testPostId})],
            newsletterBasicStats: [],
            newsletterClickStats: []
        });

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.averageStats).toEqual({
                openedRate: 0,
                clickedRate: 0
            });
        });
    });

    it('provides top performing links sorted by click count', async () => {
        const linksData = [
            {
                post_id: testPostId,
                link: {link_id: 'link1', to: 'https://popular.com', from: 'post', edited: false},
                count: {clicks: 25}
            },
            {
                post_id: testPostId,
                link: {link_id: 'link2', to: 'https://www.another.com', from: 'post', edited: false},
                count: {clicks: 15}
            }
        ];

        mockServer.setup({
            posts: [mockData.post({id: testPostId})],
            links: linksData
        });

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            // Should be sorted by click count (highest first) and URLs cleaned
            expect(result.current.topLinks).toHaveLength(2);
            expect(result.current.topLinks[0].count).toBe(25);
            expect(result.current.topLinks[1].count).toBe(15);
            
            // Verify URL cleaning and display formatting happens
            expect(result.current.topLinks[0].link.title).toBe('popular.com');
            expect(result.current.topLinks[1].link.title).toBe('another.com');
        });
    });

    it('calculates precise rates with fractional results', async () => {
        const postWithPrecisionChallenge = mockData.post({
            id: testPostId,
            email: {
                email_count: 7,
                opened_count: 2
            },
            count: {
                clicks: 1
            }
        });

        mockServer.setup({
            posts: [postWithPrecisionChallenge]
        });

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            // 2/7 = 0.2857142857142857... (JavaScript precision)
            expect(result.current.stats.openedRate).toBeCloseTo(2 / 7, 10);
            // 1/7 = 0.14285714285714285... (JavaScript precision)
            expect(result.current.stats.clickedRate).toBeCloseTo(1 / 7, 10);
            
            // Ensure calculations return valid numbers (not NaN or Infinity)
            expect(Number.isFinite(result.current.stats.openedRate)).toBe(true);
            expect(Number.isFinite(result.current.stats.clickedRate)).toBe(true);
        });
    });

    it('handles enterprise scale numbers correctly', async () => {
        const enterprisePost = mockData.post({
            id: testPostId,
            email: {
                email_count: 1000000,
                opened_count: 250000
            },
            count: {
                clicks: 12500
            }
        });

        mockServer.setup({
            posts: [enterprisePost]
        });

        const {result} = renderHook(() => usePostNewsletterStats(testPostId), {
            wrapper: createTestWrapper()
        });

        await waitFor(() => {
            expect(result.current.stats).toEqual({
                sent: 1000000,
                opened: 250000,
                clicked: 12500,
                openedRate: 0.25, // 250000/1000000
                clickedRate: 0.0125 // 12500/1000000
            });
            
            // Ensure calculations maintain precision at scale
            expect(Number.isFinite(result.current.stats.openedRate)).toBe(true);
            expect(Number.isFinite(result.current.stats.clickedRate)).toBe(true);
        });
    });
});