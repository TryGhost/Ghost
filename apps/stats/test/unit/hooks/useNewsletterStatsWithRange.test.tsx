import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createTestWrapper, setupStatsAppMocks} from '../../utils/test-helpers';
import {renderHook} from '@testing-library/react';
import {useNewsletterStatsWithRange, useSubscriberCountWithRange} from '@src/hooks/useNewsletterStatsWithRange';

// Mock the getRangeDates function
vi.mock('@src/hooks/useGrowthStats', () => ({
    getRangeDates: vi.fn((range: number) => ({
        dateFrom: `2024-01-${String(31 - range).padStart(2, '0')}`,
        endDate: '2024-01-31'
    }))
}));

// Mock the API hooks
vi.mock('@tryghost/admin-x-framework/api/stats');
vi.mock('@src/providers/GlobalDataProvider');

const mockUseNewsletterStatsByNewsletterId = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useNewsletterStatsByNewsletterId;
const mockUseSubscriberCountByNewsletterId = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useSubscriberCountByNewsletterId;

describe('Newsletter Stats Hooks', () => {
    let mocks: ReturnType<typeof setupStatsAppMocks>;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks = setupStatsAppMocks();
        
        // Apply the mocks to the actual imported modules
        mockUseNewsletterStatsByNewsletterId.mockImplementation(mocks.mockUseNewsletterStatsByNewsletterId);
        mockUseSubscriberCountByNewsletterId.mockImplementation(mocks.mockUseSubscriberCountByNewsletterId);
    });

    describe('useNewsletterStatsWithRange', () => {
        it('uses default range of 30 days when no range provided', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(), {wrapper});
            
            // The hook should be called with default parameters
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStatsByNewsletterId).toHaveBeenCalledWith(undefined, {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                order: 'date desc'
            });
        });

        it('uses default order of "date desc" when no order provided', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(7), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStatsByNewsletterId).toHaveBeenCalledWith(undefined, {
                date_from: '2024-01-24',
                date_to: '2024-01-31',
                order: 'date desc'
            });
        });

        it('accepts custom range parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(14), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStatsByNewsletterId).toHaveBeenCalledWith(undefined, {
                date_from: '2024-01-17',
                date_to: '2024-01-31',
                order: 'date desc'
            });
        });

        it('accepts custom order parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(30, 'open_rate desc'), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStatsByNewsletterId).toHaveBeenCalledWith(undefined, {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                order: 'open_rate desc'
            });
        });

        it('accepts newsletter ID parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(30, 'date desc', 'newsletter-123'), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStatsByNewsletterId).toHaveBeenCalledWith('newsletter-123', {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                order: 'date desc'
            });
        });
    });

    describe('useSubscriberCountWithRange', () => {
        it('uses default range of 30 days when no range provided', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useSubscriberCountWithRange(), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCountByNewsletterId).toHaveBeenCalledWith(undefined, {
                date_from: '2024-01-01',
                date_to: '2024-01-31'
            });
        });

        it('accepts custom range parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useSubscriberCountWithRange(7), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCountByNewsletterId).toHaveBeenCalledWith(undefined, {
                date_from: '2024-01-24',
                date_to: '2024-01-31'
            });
        });

        it('accepts newsletter ID parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useSubscriberCountWithRange(30, 'newsletter-123'), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCountByNewsletterId).toHaveBeenCalledWith('newsletter-123', {
                date_from: '2024-01-01',
                date_to: '2024-01-31'
            });
        });
    });
}); 