import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { browseConfigWithDunning, dunningWindow } from '@test-utils/fixtures/dunning';

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
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));

      render(<DunningBanner />);

      expect(screen.getByText('Your payment didn’t go through.')).toBeInTheDocument();
      expect(screen.getByText(/26 days left/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute(
        'href',
        '#/pro/update-card/return',
      );
    });

    test('shows staff the remind-the-owner copy without any CTA', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));
      mockUseCurrentUser.mockReturnValue({ data: editorUser });

      render(<DunningBanner />);

      expect(screen.getByText('This site’s payment failed.')).toBeInTheDocument();
      expect(screen.getByText(/Remind the site owner/)).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('renders nothing on the billing route', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));
      mockUseLocation.mockReturnValue({ pathname: '/pro/billing' });

      render(<DunningBanner />);

      expect(screen.queryByTestId('dunning-banner')).not.toBeInTheDocument();
    });

    test('hands over to the takeover once the locked phase starts', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));

      render(<DunningBanner />);

      expect(screen.queryByTestId('dunning-banner')).not.toBeInTheDocument();
    });

    test('carries the warning on the export route while the takeover stands down', () => {
      // Undismissed locked phase on /settings/migration: the takeover stands
      // down so the export tools stay usable — the banner must step in, or
      // the user is left with no payment warning at all.
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));
      mockUseLocation.mockReturnValue({ pathname: '/settings/migration' });

      render(
        <>
          <DunningOverlay />
          <DunningBanner />
        </>,
      );

      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
      expect(screen.getByTestId('dunning-banner')).toBeInTheDocument();
    });
  });

  describe('DunningOverlay', () => {
    test('renders nothing during the warning phase', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));

      render(<DunningOverlay />);

      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
      // Mounted on every Admin page, so the user list must not be fetched
      // outside the staff-facing takeover
      expect(mockUseBrowseUsers).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });

    test('takes over for the owner in the locked phase', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));

      render(<DunningOverlay />);

      expect(screen.getByText('Your site will be suspended in 6 days')).toBeInTheDocument();
      expect(screen.getByText(/avoid suspension/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute(
        'href',
        '#/pro/update-card/return',
      );
      expect(screen.getByRole('link', { name: 'Download my data' })).toHaveAttribute(
        'href',
        '#/settings/migration',
      );
    });

    test('stands down on the export route so the data download stays reachable', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));
      mockUseLocation.mockReturnValue({ pathname: '/settings/migration' });

      render(<DunningOverlay />);

      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
    });

    test('shows staff the owner card instead of a payment link', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));
      mockUseCurrentUser.mockReturnValue({ data: editorUser });

      render(<DunningOverlay />);

      expect(screen.getByText('Aileen (Owner)')).toBeInTheDocument();
      expect(screen.getByText('owner@example.com')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(mockUseBrowseUsers).toHaveBeenCalledWith({
        enabled: true,
        searchParams: { filter: "roles.name:'Owner'", limit: '1', include: 'roles' },
      });
    });

    test('labels the owner card by email when the owner has no name', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));
      mockUseCurrentUser.mockReturnValue({ data: editorUser });
      mockUseBrowseUsers.mockReturnValue({ data: { users: [{ ...ownerUser, name: '' }] } });

      render(<DunningOverlay />);

      expect(screen.getByText('owner@example.com (Owner)')).toBeInTheDocument();
    });

    test('degrades to copy only when staff cannot resolve the owner', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));
      mockUseCurrentUser.mockReturnValue({ data: editorUser });
      mockUseBrowseUsers.mockReturnValue({ data: undefined });

      render(<DunningOverlay />);

      expect(screen.getByTestId('dunning-overlay')).toBeInTheDocument();
      expect(screen.getByText(/Remind the site owner/)).toBeInTheDocument();
      expect(screen.queryByText(/\(Owner\)/)).not.toBeInTheDocument();
    });

    test('stands down on the billing route so the user can pay', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));
      mockUseLocation.mockReturnValue({ pathname: '/pro' });

      render(<DunningOverlay />);

      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
    });

    test('moves focus into the dialog and hands it back on dismissal', () => {
      // Start outside the locked phase with focus on a page control
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));
      const view = render(
        <>
          <button data-testid="page-control" type="button">
            page control
          </button>
          <DunningOverlay />
        </>,
      );
      screen.getByTestId('page-control').focus();

      // The window crosses into the locked phase: the takeover appears and
      // takes keyboard focus so Tab starts inside the dialog
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));
      view.rerender(
        <>
          <button data-testid="page-control" type="button">
            page control
          </button>
          <DunningOverlay />
        </>,
      );
      expect(screen.getByTestId('dunning-overlay')).toHaveFocus();

      // Dismissing hands focus back to the control that had it
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
      expect(screen.getByTestId('page-control')).toHaveFocus();
    });

    test('leaves focus alone when the previously focused control is gone', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));
      const view = render(
        <>
          <button data-testid="page-control" type="button">
            page control
          </button>
          <DunningOverlay />
        </>,
      );
      screen.getByTestId('page-control').focus();

      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));
      view.rerender(
        <>
          <button data-testid="page-control" type="button">
            page control
          </button>
          <DunningOverlay />
        </>,
      );
      expect(screen.getByTestId('dunning-overlay')).toHaveFocus();

      // The control disappears while the takeover is up (e.g. its screen
      // re-rendered); dismissal must not try to focus a detached node
      view.rerender(<DunningOverlay />);
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
      expect(document.body).toHaveFocus();
    });

    test('dismissing drops back to the urgent warning banner', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));

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

    test('following Pay now suppresses the takeover without a pre-navigation flash', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));

      const view = render(
        <>
          <DunningOverlay />
          <DunningBanner />
        </>,
      );

      fireEvent.click(screen.getByRole('link', { name: 'Pay now' }));

      // Nothing swaps before the route change: the takeover holds the screen
      // until the billing route takes over.
      expect(screen.getByTestId('dunning-overlay')).toBeInTheDocument();
      expect(screen.queryByTestId('dunning-banner')).not.toBeInTheDocument();

      // The click records where to return after the payment (consumed by the
      // Ember billing service's previousPage handling)
      expect(window.sessionStorage.getItem('ghost-dunning-pay-return-route')).toBe('/analytics');

      // On the billing route both stand down as usual.
      mockUseLocation.mockReturnValue({ pathname: '/pro/update-card' });
      view.rerender(
        <>
          <DunningOverlay />
          <DunningBanner />
        </>,
      );
      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();

      // Leaving billing again, the recorded suppression kicks in: the banner
      // carries the message and the takeover stays away.
      mockUseLocation.mockReturnValue({ pathname: '/analytics' });
      view.rerender(
        <>
          <DunningOverlay />
          <DunningBanner />
        </>,
      );
      expect(screen.queryByTestId('dunning-overlay')).not.toBeInTheDocument();
      expect(screen.getByTestId('dunning-banner')).toBeInTheDocument();
    });

    test('shows the imminent headline when the suspension date has passed', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(30)));

      render(<DunningOverlay />);

      expect(screen.getByText('Your site will be suspended soon')).toBeInTheDocument();
    });
  });
});
