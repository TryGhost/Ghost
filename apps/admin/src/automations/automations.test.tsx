import Automations from './automations';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const { mockUseBrowseAutomations, mockUseBrowseSettings, mockUseBrowseConfig, mockUseCurrentUser } =
  vi.hoisted(() => ({
    mockUseBrowseAutomations: vi.fn(),
    mockUseBrowseSettings: vi.fn(),
    mockUseBrowseConfig: vi.fn(),
    mockUseCurrentUser: vi.fn(),
  }));

vi.mock('@tryghost/admin-x-framework/api/automations', async () => {
  const actual = await vi.importActual<
    typeof import('@tryghost/admin-x-framework/api/automations')
  >('@tryghost/admin-x-framework/api/automations');
  return {
    ...actual,
    useBrowseAutomations: mockUseBrowseAutomations,
  };
});

vi.mock('@tryghost/admin-x-framework/api/settings', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/settings')>(
    '@tryghost/admin-x-framework/api/settings',
  );
  return {
    ...actual,
    useBrowseSettings: mockUseBrowseSettings,
  };
});

vi.mock('@tryghost/admin-x-framework/api/config', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/config')>(
    '@tryghost/admin-x-framework/api/config',
  );
  return {
    ...actual,
    useBrowseConfig: mockUseBrowseConfig,
  };
});

vi.mock('@tryghost/admin-x-framework/api/current-user', async () => {
  const actual = await vi.importActual<
    typeof import('@tryghost/admin-x-framework/api/current-user')
  >('@tryghost/admin-x-framework/api/current-user');
  return {
    ...actual,
    useCurrentUser: mockUseCurrentUser,
  };
});

vi.mock('@tryghost/admin-x-framework', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework')>(
    '@tryghost/admin-x-framework',
  );
  return {
    ...actual,
    useFeaturebaseToken: () => ({ data: undefined }),
    useFeaturebase: () => ({
      isAvailable: false,
      openFeedbackWidget: () => {},
      preloadFeedbackWidget: () => {},
    }),
  };
});

const automations = [
  {
    id: 'automation-id-1',
    name: 'Free member welcome flow',
    description: 'Greet new free members.',
    slug: 'member-welcome-email-free',
    status: 'active' as const,
    stats: {
      last_run_created_at: '2026-07-21T07:12:00.000Z',
      total_run_count: 1432,
      in_progress_run_count: 118,
    },
  },
  {
    id: 'automation-id-2',
    name: 'Paid member welcome flow',
    description: 'Welcome new paid members.',
    slug: 'member-welcome-email-paid',
    status: 'inactive' as const,
    stats: {
      last_run_created_at: null,
      total_run_count: 0,
      in_progress_run_count: 0,
    },
  },
];

const stripeConnectedSettings = {
  settings: [
    { key: 'stripe_connect_secret_key', value: 'sk_connect_123' },
    { key: 'stripe_connect_publishable_key', value: 'pk_connect_123' },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <Automations />
    </MemoryRouter>,
  );

describe('Automations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBrowseAutomations.mockReturnValue({
      data: { automations },
      isError: false,
      isLoading: false,
    });
    mockUseBrowseSettings.mockReturnValue({ data: stripeConnectedSettings, isLoading: false });
    mockUseBrowseConfig.mockReturnValue({ data: { config: {} }, isLoading: false });
    mockUseCurrentUser.mockReturnValue({ data: { id: 'user-1', roles: [{ name: 'Owner' }] } });
  });

  it.each([undefined, false])('hides "New automation" button when per-tier flag is %s', (flag) => {
    mockUseBrowseConfig.mockReturnValue({
      data: { config: { labs: { automationsPerTier: flag } } },
      isLoading: false,
    });

    renderPage();

    expect(screen.queryByRole('button', { name: 'New automation' })).not.toBeInTheDocument();
  });

  it('shows the "New automation" button when per-tier flag is enabled', () => {
    mockUseBrowseConfig.mockReturnValue({
      data: { config: { labs: { automationsPerTier: true } } },
      isLoading: false,
    });

    renderPage();

    const button = screen.getByRole('button', { name: 'New automation' });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    expect(screen.getByTestId('automations-page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New automation' })).toBe(button);
  });

  it.each([
    { role: 'Owner', disabled: false },
    { role: 'Administrator', disabled: false },
    { role: 'Super Editor', disabled: true },
    { role: 'Editor', disabled: true },
    { role: 'Author', disabled: true },
    { role: 'Contributor', disabled: true },
    { role: undefined, disabled: true },
  ])('sets "New automation" disabled=$disabled for role=$role', ({ role, disabled }) => {
    mockUseBrowseConfig.mockReturnValue({
      data: { config: { labs: { automationsPerTier: true } } },
      isLoading: false,
    });
    mockUseCurrentUser.mockReturnValue({
      data: role ? { id: 'user-1', roles: [{ name: role }] } : undefined,
    });

    renderPage();

    const button = screen.getByRole('button', { name: 'New automation' });
    if (disabled) {
      expect(button).toBeDisabled();
    } else {
      expect(button).toBeEnabled();
    }
  });

  it.each([
    { count: undefined, disabled: true },
    { count: 0, disabled: false },
    { count: 19, disabled: false },
    { count: 20, disabled: true },
    { count: 21, disabled: true },
  ])('sets "New automation" disabled=$disabled with count=$count', ({ count, disabled }) => {
    mockUseBrowseConfig.mockReturnValue({
      data: { config: { labs: { automationsPerTier: true } } },
      isLoading: false,
    });
    mockUseBrowseAutomations.mockReturnValue({
      data:
        count === undefined
          ? undefined
          : {
              automations: Array.from({ length: count }, (_, index) => ({
                ...automations[index % automations.length],
                id: `automation-id-${index}`,
              })),
            },
      isError: false,
      isLoading: count === undefined,
    });

    renderPage();

    const button = screen.getByRole('button', { name: 'New automation' });
    if (disabled) {
      expect(button).toBeDisabled();
    } else {
      expect(button).toBeEnabled();
    }
  });

  it('counts hidden paid automations towards the limit', () => {
    mockUseBrowseConfig.mockReturnValue({
      data: { config: { stripeDirect: true, labs: { automationsPerTier: true } } },
      isLoading: false,
    });
    mockUseBrowseAutomations.mockReturnValue({
      data: {
        automations: Array.from({ length: 20 }, (_, index) => ({
          ...automations[index % automations.length],
          id: `automation-id-${index}`,
        })),
      },
      isError: false,
      isLoading: false,
    });

    renderPage();

    expect(screen.queryByText('Paid member welcome flow')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New automation' })).toBeDisabled();
  });

  it('shows free and paid sequences when Stripe is connected', () => {
    renderPage();

    expect(mockUseBrowseAutomations).toHaveBeenCalledWith({
      defaultErrorHandler: false,
      refetchOnMount: 'always',
      staleTime: 0,
    });
    expect(screen.getByText('Free member welcome flow')).toBeInTheDocument();
    expect(screen.getByText('Paid member welcome flow')).toBeInTheDocument();
  });

  it('hides the paid sequence when only Connect keys exist but stripeDirect is required', () => {
    mockUseBrowseConfig.mockReturnValue({
      data: { config: { stripeDirect: true } },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Free member welcome flow')).toBeInTheDocument();
    expect(screen.queryByText('Paid member welcome flow')).not.toBeInTheDocument();
  });
});
