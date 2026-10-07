import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import UpgradeBanner from './upgrade-banner';

const { mockUseBrowseConfig } = vi.hoisted(() => ({
  mockUseBrowseConfig: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: mockUseBrowseConfig,
}));

const withUpgradeBanner = (upgradeBanner?: Record<string, string>) => ({
  data: {
    config: {
      hostSettings: {
        billing: { enabled: true, url: 'https://billing.example.com', upgradeBanner },
      },
    },
  },
});

const logoSources = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'));

describe('UpgradeBanner', () => {
  beforeEach(() => {
    mockUseBrowseConfig.mockReturnValue(withUpgradeBanner());
  });

  test("renders Ghost's default copy, link and branding", () => {
    render(<UpgradeBanner trialDaysRemaining={14} />);

    expect(screen.getByText('Unlock every feature')).toBeInTheDocument();
    expect(screen.getByText(/Choose a plan to access the full power of Ghost/)).toHaveTextContent(
      'you have 14 days free trial remaining.',
    );
    expect(screen.getByRole('link', { name: 'Upgrade now' })).toHaveAttribute(
      'href',
      '#/pro/billing/plans',
    );
    expect(screen.getAllByAltText('Ghost Pro')).toHaveLength(2);
  });

  test('uses the configured title, message and upgrade link', () => {
    mockUseBrowseConfig.mockReturnValue(
      withUpgradeBanner({
        title: 'Ready to launch?',
        message: 'You have {{days}} left to try things out.',
        upgradeUrl: 'https://billing.example.com/plans',
      }),
    );

    render(<UpgradeBanner trialDaysRemaining={7} />);

    expect(screen.getByText('Ready to launch?')).toBeInTheDocument();
    expect(screen.getByText(/You have/)).toHaveTextContent(
      'You have 7 days left to try things out.',
    );
    expect(screen.getByRole('link', { name: 'Upgrade now' })).toHaveAttribute(
      'href',
      'https://billing.example.com/plans',
    );
    expect(screen.queryByText('Unlock every feature')).not.toBeInTheDocument();
  });

  test('replaces every days placeholder in a configured message', () => {
    mockUseBrowseConfig.mockReturnValue(
      withUpgradeBanner({
        message: '{{days}} left — upgrade before those {{days}} are up.',
      }),
    );

    render(<UpgradeBanner trialDaysRemaining={3} />);

    expect(screen.getByText(/left — upgrade before/)).toHaveTextContent(
      '3 days left — upgrade before those 3 days are up.',
    );
  });

  test('renders a configured message without the days placeholder unchanged', () => {
    mockUseBrowseConfig.mockReturnValue(
      withUpgradeBanner({ message: 'Pick a plan to unlock everything.' }),
    );

    render(<UpgradeBanner trialDaysRemaining={7} />);

    expect(screen.getByText('Pick a plan to unlock everything.')).toBeInTheDocument();
    expect(screen.queryByText(/7 days/)).not.toBeInTheDocument();
  });

  test('uses the configured logos and alt text', () => {
    mockUseBrowseConfig.mockReturnValue(
      withUpgradeBanner({
        logo: 'https://cdn.example.com/logo.png',
        logoDark: 'https://cdn.example.com/logo-dark.png',
        logoAlt: 'Example Hosting',
      }),
    );

    const { container } = render(<UpgradeBanner trialDaysRemaining={7} />);

    expect(logoSources(container)).toEqual([
      'https://cdn.example.com/logo.png',
      'https://cdn.example.com/logo-dark.png',
    ]);
    expect(screen.getAllByAltText('Example Hosting')).toHaveLength(2);
  });

  test('reuses a single configured logo in dark mode and drops the Ghost Pro alt text', () => {
    mockUseBrowseConfig.mockReturnValue(
      withUpgradeBanner({ logo: 'https://cdn.example.com/logo.png' }),
    );

    const { container } = render(<UpgradeBanner trialDaysRemaining={7} />);

    expect(logoSources(container)).toEqual([
      'https://cdn.example.com/logo.png',
      'https://cdn.example.com/logo.png',
    ]);
    expect(screen.queryByAltText('Ghost Pro')).not.toBeInTheDocument();
  });
});
