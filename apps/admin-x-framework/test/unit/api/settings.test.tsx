import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import {
  useEmailTrackClicks,
  useEmailTrackOpens,
  useMembersTrackSources,
  useNewslettersEnabled,
  usePaidMembersEnabled,
  useWebAnalyticsEnabled,
} from '../../../src/api/settings';
import { FrameworkProvider } from '../../../src/providers/framework-provider';
import { withMockFetch } from '../../utils/mock-fetch';

// Mock the currentUser API for permission checks
vi.mock('../../../src/api/current-user', () => ({
  useCurrentUser: vi.fn().mockReturnValue({
    data: {
      id: '1',
      name: 'Test User',
      roles: [{ name: 'Administrator', id: '1' }],
    },
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
  <FrameworkProvider
    externalNavigate={() => {}}
    ghostVersion="5.x"
    sentryDSN=""
    unsplashConfig={{
      Authorization: '',
      'Accept-Version': '',
      'Content-Type': '',
      'App-Pragma': '',
      'X-Unsplash-Cache': true,
    }}
    onDelete={() => {}}
    onInvalidate={() => {}}
    onUpdate={() => {}}
  >
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </FrameworkProvider>
);

const useSelectors = () => ({
  paidMembersEnabled: usePaidMembersEnabled(),
  newslettersEnabled: useNewslettersEnabled(),
  membersTrackSources: useMembersTrackSources(),
  emailTrackOpens: useEmailTrackOpens(),
  emailTrackClicks: useEmailTrackClicks(),
  webAnalyticsEnabled: useWebAnalyticsEnabled(),
});

describe('settings selectors', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('returns undefined while settings are loading, except the strict kill-switch', async () => {
    await withMockFetch(
      {
        json: { settings: [{ key: 'web_analytics_enabled', value: true }] },
      },
      async () => {
        const { result } = renderHook(() => useSelectors(), { wrapper });

        // First render: the settings query has no data yet.
        expect(result.current.paidMembersEnabled).toBeUndefined();
        expect(result.current.newslettersEnabled).toBeUndefined();
        expect(result.current.membersTrackSources).toBeUndefined();
        expect(result.current.emailTrackOpens).toBeUndefined();
        expect(result.current.emailTrackClicks).toBeUndefined();
        // Unresolved counts as off so data hooks never query early.
        expect(result.current.webAnalyticsEnabled).toBe(false);

        // Only a settled `true` turns the kill-switch on.
        await waitFor(() => expect(result.current.webAnalyticsEnabled).toBe(true));
      },
    );
  });

  it('derives every flag from a loaded settings payload with enabled values', async () => {
    await withMockFetch(
      {
        json: {
          settings: [
            { key: 'paid_members_enabled', value: true },
            { key: 'editor_default_email_recipients', value: 'visibility' },
            { key: 'members_track_sources', value: true },
            { key: 'email_track_opens', value: true },
            { key: 'email_track_clicks', value: true },
            { key: 'web_analytics_enabled', value: true },
          ],
        },
      },
      async () => {
        const { result } = renderHook(() => useSelectors(), { wrapper });

        await waitFor(() =>
          expect(result.current).toEqual({
            paidMembersEnabled: true,
            newslettersEnabled: true,
            membersTrackSources: true,
            emailTrackOpens: true,
            emailTrackClicks: true,
            webAnalyticsEnabled: true,
          }),
        );
      },
    );
  });

  it('derives every flag from a loaded settings payload with disabled values', async () => {
    await withMockFetch(
      {
        json: {
          settings: [
            { key: 'paid_members_enabled', value: false },
            { key: 'editor_default_email_recipients', value: 'disabled' },
            { key: 'members_track_sources', value: false },
            { key: 'email_track_opens', value: false },
            { key: 'email_track_clicks', value: false },
            { key: 'web_analytics_enabled', value: false },
          ],
        },
      },
      async () => {
        const { result } = renderHook(() => useSelectors(), { wrapper });

        await waitFor(() =>
          expect(result.current).toEqual({
            paidMembersEnabled: false,
            newslettersEnabled: false,
            membersTrackSources: false,
            emailTrackOpens: false,
            emailTrackClicks: false,
            webAnalyticsEnabled: false,
          }),
        );
      },
    );
  });

  it('defaults missing booleans to false and missing recipients to enabled', async () => {
    await withMockFetch(
      {
        json: { settings: [] },
      },
      async () => {
        const { result } = renderHook(() => useSelectors(), { wrapper });

        await waitFor(() =>
          expect(result.current).toEqual({
            paidMembersEnabled: false,
            // Only an explicit 'disabled' turns newsletters off.
            newslettersEnabled: true,
            membersTrackSources: false,
            emailTrackOpens: false,
            emailTrackClicks: false,
            webAnalyticsEnabled: false,
          }),
        );
      },
    );
  });
});
