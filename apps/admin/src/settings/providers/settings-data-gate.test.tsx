import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import SettingsDataGate from './settings-data-gate';

const queryOptionMocks = vi.hoisted(() => ({
  config: vi.fn(),
  currentUser: vi.fn(),
  settings: vi.fn(),
  site: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfigQueryOptions: queryOptionMocks.config,
}));

vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
  useCurrentUserQueryOptions: queryOptionMocks.currentUser,
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  useBrowseSettingsQueryOptions: queryOptionMocks.settings,
}));

vi.mock('@tryghost/admin-x-framework/api/site', () => ({
  useBrowseSiteQueryOptions: queryOptionMocks.site,
}));

describe('SettingsDataGate', () => {
  it('starts every unconditional settings query concurrently', async () => {
    const started: string[] = [];
    const resolveQueries: Array<() => void> = [];
    const queryOptions = (name: string) => ({
      queryKey: [name],
      queryFn: () =>
        new Promise<Record<string, never>>((resolve) => {
          started.push(name);
          resolveQueries.push(() => resolve({}));
        }),
    });

    queryOptionMocks.config.mockReturnValue(queryOptions('config'));
    queryOptionMocks.currentUser.mockReturnValue(queryOptions('current-user'));
    queryOptionMocks.settings.mockReturnValue(queryOptions('settings'));
    queryOptionMocks.site.mockReturnValue(queryOptions('site'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsDataGate>
          <div>Settings loaded</div>
        </SettingsDataGate>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(started).toEqual(['config', 'current-user', 'settings', 'site']);
    });
    expect(screen.queryByText('Settings loaded')).not.toBeInTheDocument();

    act(() => {
      resolveQueries.forEach((resolve) => resolve());
    });

    await expect(screen.findByText('Settings loaded')).resolves.toBeVisible();
  });
});
