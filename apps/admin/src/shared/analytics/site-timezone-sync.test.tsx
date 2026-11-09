import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SiteTimezoneSync } from '@/shared/analytics/site-timezone-sync';
import { getRangeDates, setSiteTimezoneFallback } from '@/shared/analytics/chart-helpers';

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  useBrowseSettings: vi.fn(),
}));

const mockUseBrowseSettings = vi.mocked(
  await import('@tryghost/admin-x-framework/api/settings'),
).useBrowseSettings;

const setup = (data?: { settings: { key: string; value: string }[] }) => {
  mockUseBrowseSettings.mockReturnValue({
    data,
    error: null,
    isLoading: !data,
  } as unknown as ReturnType<typeof mockUseBrowseSettings>);
};

// Observes the fallback through getRangeDates with the browser reporting no
// timezone — the only condition under which the fallback is read
const mockNoBrowserTimezone = () => {
  const options = new Intl.DateTimeFormat().resolvedOptions();
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...options,
    timeZone: undefined as unknown as string,
  });
};

describe('SiteTimezoneSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setSiteTimezoneFallback(undefined);
  });

  it('pushes the configured timezone into the chart-helpers fallback', () => {
    setup({ settings: [{ key: 'timezone', value: 'America/Vancouver' }] });

    render(<SiteTimezoneSync />);
    mockNoBrowserTimezone();

    expect(getRangeDates(30).timezone).toBe('America/Vancouver');
  });

  it('leaves the fallback unset while settings are still loading', () => {
    setup(undefined);

    render(<SiteTimezoneSync />);
    mockNoBrowserTimezone();

    expect(getRangeDates(30).timezone).toBe('Etc/UTC');
  });

  it('renders nothing', () => {
    setup({ settings: [{ key: 'timezone', value: 'America/Vancouver' }] });

    const { container } = render(<SiteTimezoneSync />);

    expect(container).toBeEmptyDOMElement();
  });
});
