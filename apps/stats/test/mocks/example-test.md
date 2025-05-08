```typescript
// Example test file using centralized mocks
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import {setupReactMocks} from '../mocks/react';
import {setupAdminXStatsMocks, setupGrowthStatsMocks} from '../mocks/api-hooks';
import {setupShadeMocks, setupStatsLayoutMocks} from '../mocks/ui-components';
import {type MockedFunction} from 'vitest';
import {useNewsletterStats, useSubscriberCount} from '@tryghost/admin-x-framework/api/stats';
import {getRangeDates} from '../../src/hooks/useGrowthStats';
import {useNewsletterStatsWithRange} from '../../src/hooks/useNewsletterStatsWithRange';

// Setup all mocks
setupReactMocks();
setupAdminXStatsMocks();
setupGrowthStatsMocks();
setupShadeMocks();
setupStatsLayoutMocks();

describe('useNewsletterStatsWithRange', () => {
    // Setup type for mocked functions
    const mockUseNewsletterStats = useNewsletterStats as MockedFunction<typeof useNewsletterStats>;
    const mockUseSubscriberCount = useSubscriberCount as MockedFunction<typeof useSubscriberCount>;
    const mockGetRangeDates = getRangeDates as MockedFunction<typeof getRangeDates>;
    
    beforeEach(() => {
        vi.resetAllMocks();
        
        // Override default implementation for this test if needed
        mockGetRangeDates.mockImplementation((range: number) => {
            // Test-specific implementation
            if (range === 7) {
                return {
                    dateFrom: '2023-01-01',
                    endDate: '2023-01-07'
                };
            }
            return {
                dateFrom: '2023-01-01',
                endDate: '2023-01-30'
            };
        });
    });
    
    it('uses provided range value', () => {
        useNewsletterStatsWithRange(7);
        
        expect(mockGetRangeDates).toHaveBeenCalledWith(7);
        expect(mockUseNewsletterStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2023-01-01',
                date_to: '2023-01-07',
                order: 'date desc'
            }
        });
    });
}); 