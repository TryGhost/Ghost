import { mockApiHook } from '@tryghost/admin-x-framework/test/hook-testing-utils';
import { newsletterBasicStat, topPostStat } from '@tryghost/test-data';
import { vi } from 'vitest';

// Import types from API modules
import type {
  NewsletterStatsResponseType,
  TopPostsStatsResponseType,
} from '@tryghost/admin-x-framework/api/stats';

// Canned default responses, built from the canonical @tryghost/test-data
// builders (values ported from admin-x-framework's retired test fixtures).
const newsletterStatsResponse: NewsletterStatsResponseType = {
  stats: newsletterBasicStat.many([
    {
      post_id: '64d623b64676110001e897d9',
      post_title: 'Welcome to Ghost',
      send_date: '2024-01-05T10:00:00.000Z',
      sent_to: 1000,
      total_opens: 450,
      open_rate: 0.45,
      total_clicks: 120,
      click_rate: 0.12,
    },
    {
      post_id: '64d623b64676110001e897d8',
      post_title: 'Getting Started with Ghost',
      send_date: '2024-01-04T10:00:00.000Z',
      sent_to: 980,
      total_opens: 420,
      open_rate: 0.43,
      total_clicks: 98,
      click_rate: 0.1,
    },
    {
      post_id: '64d623b64676110001e897d7',
      post_title: 'Ghost Tips and Tricks',
      send_date: '2024-01-03T10:00:00.000Z',
      sent_to: 950,
      total_opens: 380,
      open_rate: 0.4,
      total_clicks: 85,
      click_rate: 0.09,
    },
  ]) as NewsletterStatsResponseType['stats'],
  meta: {},
};

const topPostsResponse: TopPostsStatsResponseType = {
  stats: topPostStat.many([
    {
      post_id: '64d623b64676110001e897d9',
      attribution_url: '/welcome-to-ghost/',
      attribution_type: 'post',
      attribution_id: '64d623b64676110001e897d9',
      title: 'Welcome to Ghost',
      free_members: 250,
      paid_members: 50,
      mrr: 25000,
      published_at: '2024-01-05T10:00:00.000Z',
      post_type: 'post',
      url_exists: true,
    },
    {
      post_id: '64d623b64676110001e897d8',
      attribution_url: '/getting-started-with-ghost/',
      attribution_type: 'post',
      attribution_id: '64d623b64676110001e897d8',
      title: 'Getting Started with Ghost',
      free_members: 180,
      paid_members: 35,
      mrr: 17500,
      published_at: '2024-01-04T10:00:00.000Z',
      post_type: 'post',
      url_exists: true,
    },
    {
      post_id: '64d623b64676110001e897d7',
      attribution_url: '/ghost-tips-and-tricks/',
      attribution_type: 'post',
      attribution_id: '64d623b64676110001e897d7',
      title: 'Ghost Tips and Tricks',
      free_members: 120,
      paid_members: 20,
      mrr: 10000,
      published_at: '2024-01-03T10:00:00.000Z',
      post_type: 'post',
      url_exists: true,
    },
  ]),
  meta: {},
};

// Default mock data
const defaultMockData = {
  // View-state exposed by useAnalytics (AnalyticsProvider)
  analyticsViewState: {
    range: 30,
    setRange: vi.fn(),
    selectedNewsletterId: null,
    setSelectedNewsletterId: vi.fn(),
  },
  // Framework data exposed by useAnalyticsData (sourced from the shell)
  analyticsData: {
    isLoading: false,
    settings: [],
    config: undefined,
    statsConfig: undefined,
    site: {},
  },
};

/**
 * Universal setup for stats app
 */
export const setupStatsAppMocks = () => {
  // Create mock functions
  const mockUseNewsletterStatsByNewsletterId = vi.fn();
  const mockUseSubscriberCountByNewsletterId = vi.fn();
  const mockUseTopPostsStats = vi.fn();
  const mockUseAnalytics = vi.fn();
  const mockUseAnalyticsData = vi.fn();
  const mockGetSettingValue = vi.fn();

  // Set up ALL mocks with sensible defaults using the canned responses
  mockApiHook<NewsletterStatsResponseType>(
    mockUseNewsletterStatsByNewsletterId,
    newsletterStatsResponse,
  );
  mockApiHook<NewsletterStatsResponseType>(
    mockUseSubscriberCountByNewsletterId,
    newsletterStatsResponse,
  );
  mockApiHook<TopPostsStatsResponseType>(mockUseTopPostsStats, topPostsResponse);
  mockUseAnalytics.mockReturnValue(defaultMockData.analyticsViewState);
  mockUseAnalyticsData.mockReturnValue(defaultMockData.analyticsData);
  mockGetSettingValue.mockReturnValue('{}');

  return {
    mockUseNewsletterStatsByNewsletterId,
    mockUseSubscriberCountByNewsletterId,
    mockUseTopPostsStats,
    mockUseAnalytics,
    mockUseAnalyticsData,
    mockGetSettingValue,
  };
};
