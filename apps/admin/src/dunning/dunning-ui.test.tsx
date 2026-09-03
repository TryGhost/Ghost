import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DunningBanner } from './dunning-banner';
import { DunningOverlay } from './dunning-overlay';

const {
  mockUseBrowseConfig,
  mockUseSubscriptionStatus,
  mockUseCurrentUser,
  mockUseBrowseUsers,
  mockUseLocation,
} = vi.hoisted(() => ({
  mockUseBrowseConfig: vi.fn(),
  mockUseSubscriptionStatus: vi.fn(),
  mockUseCurrentUser: vi.fn(),
  mockUseBrowseUsers: vi.fn(),
  mockUseLocation: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework', () => ({
  useLocation: mockUseLocation,
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: mockUseBrowseConfig,
}));

vi.mock('@tryghost/admin-x-framework/api/current-user', async () => {
  const actual = await vi.importActual<
    typeof import('@tryghost/admin-x-framework/api/current-user')
  >('@tryghost/admin-x-framework/api/current-user');
  return { ...actual, useCurrentUser: mockUseCurrentUser };
});

vi.mock('@tryghost/admin-x-framework/api/users', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/users')>(
    '@tryghost/admin-x-framework/api/users',
  );
  return { ...actual, useBrowseUsers: mockUseBrowseUsers };
});

vi.mock('@/ember-bridge', () => ({
  useSubscriptionStatus: mockUseSubscriptionStatus,
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-10T12:00:00Z');

const ownerUser = {
  id: 'owner-id',
  name: 'Aileen',
  email: 'owner@example.com',
  roles: [{ name: 'Owner' }],
};
const editorUser = {
  id: 'editor-id',
  email: 'editor@example.com',
  roles: [{ name: 'Editor' }],
};

const configWithDunning = (elapsedDays: number, windowDays = 28) => ({
  data: {
    config: {
      labs: { dunningWarnings: true },
      hostSettings: {
        billing: {
          enabled: true,
          url: 'https://billing.example.com',
          dunning: {
            active: true,
            paymentFailedAt: new Date(NOW.getTime() - elapsedDays * DAY_MS).toISOString(),
            suspendsAt: new Date(NOW.getTime() + (windowDays - elapsedDays) * DAY_MS).toISOString(),
          },
        },
      },
    },
  },
});

describe('dunning UI', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    window.sessionStorage.clear();
    mockUseSubscriptionStatus.mockReturnValue(null);
    mockUseLocation.mockReturnValue({ pathname: '/analytics' });
    mockUseCurrentUser.mockReturnValue({ data: ownerUser });
    mockUseBrowseUsers.mockReturnValue({ data: { users: [ownerUser, editorUser] } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('DunningBanner', () => {
    test('renders nothing without dunning config', () => {
      mockUseBrowseConfig.mockReturnValue({ data: { config: { hostSettings: {} } } });

      render(<DunningBanner />);

      expect(screen.queryByTestId('dunning-banner')).not.toBeInTheDocument();
    });

    test('shows the owner a Pay now link to the billing app', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(2));

      render(<DunningBanner />);

      expect(screen.getByText('Your payment didn’t go through.')).toBeInTheDocument();
      expect(screen.getByText(/26 days left/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute(
        'href',
        '#/pro/update-card',
      );
    });

    test('shows staff the remind-the-owner copy without any CTA', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(2));
      mockUseCurrentUser.mockReturnValue({ data: editorUser });

      render(<DunningBanner />);

      expect(screen.getByText('This site’s payment failed.')).toBeInTheDocument();
      expect(screen.getByText(/Remind the site owner/)).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('renders nothing on the billing route', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(2));
      mockUseLocation.mockReturnValue({ pathname: '/pro/billing' });

      render(<DunningBanner />);

      expect(screen.queryByTestId('dunning-banner')).not.toBeInTheDocument();
    });

    test('renders nothing once the locked phase starts', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(22));

      render(<DunningBanner />);

      expect(screen.queryByTestId('dunning-banner')).not.toBeInTheDocument();
    });
  });

  describe('DunningOverlay', () => {
    test('renders nothing during the warning phase', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(2));

      render(<DunningOverlay />);

      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
    });

    test('takes over for the owner in the locked phase', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(22));

      render(<DunningOverlay />);

      expect(screen.getByText('Your site will be suspended in 6 days')).toBeInTheDocument();
      expect(screen.getByText(/avoid suspension/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute(
        'href',
        '#/pro/update-card',
      );
      expect(screen.getByRole('link', { name: 'Download my data' })).toHaveAttribute(
        'href',
        '#/settings/migration',
      );
    });

    test('stands down on the export route so the data download stays reachable', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(22));
      mockUseLocation.mockReturnValue({ pathname: '/settings/migration' });

      render(<DunningOverlay />);

      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
    });

    test('shows staff the owner card instead of a payment link', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(22));
      mockUseCurrentUser.mockReturnValue({ data: editorUser });

      render(<DunningOverlay />);

      expect(screen.getByText('Aileen (Owner)')).toBeInTheDocument();
      expect(screen.getByText('owner@example.com')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('degrades to copy only when staff cannot resolve the owner', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(22));
      mockUseCurrentUser.mockReturnValue({ data: editorUser });
      mockUseBrowseUsers.mockReturnValue({ data: undefined });

      render(<DunningOverlay />);

      expect(screen.getByTestId('dunning-overlay')).toBeInTheDocument();
      expect(screen.getByText(/Remind the site owner/)).toBeInTheDocument();
      expect(screen.queryByText(/\(Owner\)/)).not.toBeInTheDocument();
    });

    test('stands down on the billing route so the user can pay', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(22));
      mockUseLocation.mockReturnValue({ pathname: '/pro' });

      render(<DunningOverlay />);

      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
    });

    test('dismissing drops back to the urgent warning banner', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(22));

      render(
        <>
          <DunningOverlay />
          <DunningBanner />
        </>,
      );

      expect(screen.getByTestId('dunning-overlay')).toBeInTheDocument();
      expect(screen.queryByTestId('dunning-banner')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
      expect(screen.getByTestId('dunning-banner')).toBeInTheDocument();
      expect(screen.getByText('Action needed: payment failed.')).toBeInTheDocument();
    });

    test('shows the imminent headline when the suspension date has passed', () => {
      mockUseBrowseConfig.mockReturnValue(configWithDunning(30));

      render(<DunningOverlay />);

      expect(screen.getByText('Your site will be suspended soon')).toBeInTheDocument();
    });
  });
});
