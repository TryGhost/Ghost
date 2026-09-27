import { renderHook } from '@testing-library/react';
import { useLimiter } from '../../../src/hooks/use-limiter';

vi.mock('../../../src/api/config', () => ({ useBrowseConfig: vi.fn() }));
vi.mock('../../../src/api/users', () => ({
  useBrowseUsers: () => ({ data: { users: [] }, isLoading: false }),
}));
vi.mock('../../../src/api/invites', () => ({
  useBrowseInvites: () => ({ data: { invites: [] }, isLoading: false }),
}));
vi.mock('../../../src/api/roles', () => ({
  useBrowseRoles: () => ({ data: { roles: [] }, isLoading: false }),
}));
vi.mock('../../../src/api/members', () => ({ useBrowseMembers: () => ({ refetch: vi.fn() }) }));
vi.mock('../../../src/api/newsletters', () => ({
  useBrowseNewsletters: () => ({ refetch: vi.fn() }),
}));

import { useBrowseConfig } from '../../../src/api/config';

const withHostSettings = (hostSettings: unknown) => {
  vi.mocked(useBrowseConfig).mockReturnValue({
    data: { config: { hostSettings } },
  } as ReturnType<typeof useBrowseConfig>);
};

describe('useLimiter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads periodic limits when the host sets a subscription start', () => {
    withHostSettings({
      subscription: { start: '2026-09-01T00:00:00.000Z' },
      limits: { emails: { maxPeriodic: 300 }, customIntegrations: { disabled: true } },
    });

    const { result } = renderHook(() => useLimiter());

    expect(result.current.isLimited('emails')).toBe(true);
    expect(result.current.isLimited('customIntegrations')).toBe(true);
  });

  it('skips periodic limits without a subscription and keeps the rest', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    withHostSettings({
      limits: { emails: { maxPeriodic: 300 }, customIntegrations: { disabled: true } },
    });

    const { result } = renderHook(() => useLimiter());

    expect(result.current.isLimited('emails')).toBe(false);
    expect(result.current.isLimited('customIntegrations')).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping emails limit'));
  });
});
