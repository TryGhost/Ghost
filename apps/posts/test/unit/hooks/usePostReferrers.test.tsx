/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it} from 'vitest';
import {createTestWrapper, mockData, mockServer} from '../../utils/msw-helpers';
import {renderHook, waitFor} from '@testing-library/react';
import {usePostReferrers} from '@src/hooks/usePostReferrers';

describe('usePostReferrers', () => {
    const testPostId = '64d623b64676110001e897d9';
    
    beforeEach(() => {
        mockServer.setup({
            // Default data for successful tests
            postReferrers: [
                {source: 'Google', referrer_url: 'https://google.com', free_members: 120, paid_members: 25, mrr: 12500},
                {source: 'Twitter', referrer_url: 'https://twitter.com', free_members: 80, paid_members: 15, mrr: 7500},
                {source: 'Direct', free_members: 50, paid_members: 10, mrr: 5000}
            ],
            postGrowthStats: [
                {post_id: testPostId, free_members: 100, paid_members: 25, mrr: 1250}
            ],
            mrrHistory: {
                items: [
                    {date: '2024-01-01', mrr: 50000, currency: 'usd'},
                    {date: '2024-01-02', mrr: 51500, currency: 'usd'},
                    {date: '2024-01-03', mrr: 52500, currency: 'usd'}
                ],
                totals: [{currency: 'usd', mrr: 55000}]
            }
        });
    });

    describe('hook functionality', () => {
        it('returns referrer stats when data is available', async () => {
            const {result} = renderHook(() => usePostReferrers(testPostId), {wrapper: createTestWrapper()});

            await waitFor(() => {
                expect(result.current.stats).toHaveLength(3);
                expect(result.current.stats[0]).toEqual({
                    source: 'Google',
                    referrer_url: 'https://google.com',
                    free_members: 120,
                    paid_members: 25,
                    mrr: 12500
                });
                expect(result.current.totals).toEqual({
                    post_id: testPostId,
                    free_members: 100,
                    paid_members: 25,
                    mrr: 1250
                });
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('returns empty stats when no data available', async () => {
            mockServer.setup({
                postReferrers: [],
                postGrowthStats: [],
                mrrHistory: {items: [], totals: []}
            });

            const {result} = renderHook(() => usePostReferrers(testPostId), {wrapper: createTestWrapper()});

            await waitFor(() => {
                expect(result.current.stats).toEqual([]);
                expect(result.current.totals).toEqual({
                    free_members: 0,
                    paid_members: 0,
                    mrr: 0
                });
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('returns USD currency when MRR history is available', async () => {
            const {result} = renderHook(() => usePostReferrers(testPostId), {wrapper: createTestWrapper()});

            await waitFor(() => {
                expect(result.current.selectedCurrency).toBe('usd');
                expect(result.current.currencySymbol).toBe('$');
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('selects currency with highest MRR when multiple currencies available', async () => {
            mockServer.setup({
                postReferrers: [mockData.postReferrer()],
                postGrowthStats: [mockData.postGrowthStat()],
                mrrHistory: {
                    items: [
                        {date: '2024-01-01', mrr: 30000, currency: 'usd'},
                        {date: '2024-01-01', mrr: 50000, currency: 'eur'}
                    ],
                    totals: [
                        {currency: 'usd', mrr: 30000},
                        {currency: 'eur', mrr: 50000}
                    ]
                }
            });

            const {result} = renderHook(() => usePostReferrers(testPostId), {wrapper: createTestWrapper()});

            await waitFor(() => {
                expect(result.current.selectedCurrency).toBe('eur');
                expect(result.current.currencySymbol).toBe('€');
            });
        });

        it('defaults to USD when no MRR history available', async () => {
            mockServer.setup({
                postReferrers: [mockData.postReferrer()],
                postGrowthStats: [mockData.postGrowthStat()],
                mrrHistory: {items: [], totals: []}
            });

            const {result} = renderHook(() => usePostReferrers(testPostId), {wrapper: createTestWrapper()});

            await waitFor(() => {
                expect(result.current.selectedCurrency).toBe('usd');
                expect(result.current.currencySymbol).toBe('$');
            });
        });
    });
}); 