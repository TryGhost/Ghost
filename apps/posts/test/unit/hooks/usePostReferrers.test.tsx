/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createTestWrapper, mockApiHook, setupUniversalMocks} from '../../utils/test-helpers';
import {getRangeDates, usePostReferrers} from '@src/hooks/usePostReferrers';
import {renderHook, waitFor} from '@testing-library/react';
import {responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

// Centralized API mocking
vi.mock('@tryghost/admin-x-framework/api/posts');
vi.mock('@tryghost/admin-x-framework/api/stats');
vi.mock('@tryghost/admin-x-framework/api/links');
vi.mock('@src/providers/PostAnalyticsContext');
vi.mock('@tryghost/admin-x-framework/api/settings');

describe('usePostReferrers', () => {
    const testPostId = '64d623b64676110001e897d9';
    let wrapper: any;
    let mocks: any;
    
    beforeEach(async () => {
        vi.clearAllMocks();
        wrapper = createTestWrapper();
        
        // Universal setup - mocks ALL API hooks with sensible defaults
        mocks = await setupUniversalMocks();
    });

    describe('getRangeDates utility function', () => {
        it('returns correct dates for today (1 day)', () => {
            const {dateFrom, endDate} = getRangeDates(1);
            expect(dateFrom).toBe(endDate);
        });

        it('returns correct dates for all time (1000 days)', () => {
            const {dateFrom} = getRangeDates(1000);
            expect(dateFrom).toBe('2010-01-01');
        });

        it('returns correct dates for specific range', () => {
            const {dateFrom, endDate} = getRangeDates(7);
            const start = new Date(dateFrom);
            const end = new Date(endDate);
            const diffInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffInDays).toBe(6); // 7 days inclusive
        });

        it('handles invalid ranges by using minimum of 1', () => {
            const {dateFrom, endDate} = getRangeDates(-5);
            const start = new Date(dateFrom);
            const end = new Date(endDate);
            const diffInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffInDays).toBe(0); // Should be treated as 1 day
        });

        it('returns dates in YYYY-MM-DD format', () => {
            const {dateFrom, endDate} = getRangeDates(30);
            expect(dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('hook functionality', () => {
        it('returns referrer stats when data is available', async () => {
            const {result} = renderHook(() => usePostReferrers(testPostId), {wrapper});

            await waitFor(() => {
                expect(result.current.stats).toEqual(responseFixtures.postReferrers.stats);
                expect(result.current.totals).toEqual({
                    post_id: '64d623b64676110001e897d9',
                    free_members: 100,
                    paid_members: 25,
                    mrr: 1250
                });
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('returns empty stats when no data available', async () => {
            mockApiHook(mocks.mockUsePostReferrers, undefined);
            mockApiHook(mocks.mockUsePostGrowthStats, undefined);

            const {result} = renderHook(() => usePostReferrers(testPostId), {wrapper});

            await waitFor(() => {
                expect(result.current.stats).toEqual([]);
                expect(result.current.totals).toBeUndefined();
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('returns loading true when referrers API is loading', async () => {
            mockApiHook(mocks.mockUsePostReferrers, undefined, true);

            const {result} = renderHook(() => usePostReferrers(testPostId), {wrapper});

            expect(result.current.isLoading).toBe(true);
        });

        it('returns loading true when growth stats API is loading', async () => {
            mockApiHook(mocks.mockUsePostGrowthStats, undefined, true);

            const {result} = renderHook(() => usePostReferrers(testPostId), {wrapper});

            expect(result.current.isLoading).toBe(true);
        });
    });
}); 