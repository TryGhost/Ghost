import { renderHook, waitFor } from '@testing-library/react';
import { useLimiter } from '../../../src/hooks/use-limiter';

vi.mock('../../../src/api/config', () => ({
  useBrowseConfig: vi.fn(),
}));

vi.mock('../../../src/api/users', () => ({
  useBrowseUsers: () => ({ data: { users: [] }, isLoading: false }),
}));

vi.mock('../../../src/api/invites', () => ({
  useBrowseInvites: () => ({ data: { invites: [] }, isLoading: false }),
}));

vi.mock('../../../src/api/roles', () => ({
  useBrowseRoles: () => ({ data: { roles: [] }, isLoading: false }),
}));

vi.mock('../../../src/api/members', () => ({
  useBrowseMembers: () => ({ refetch: vi.fn() }),
}));

vi.mock('../../../src/api/newsletters', () => ({
  useBrowseNewsletters: () => ({ refetch: vi.fn() }),
}));

import { useBrowseConfig } from '../../../src/api/config';

const mockUseBrowseConfig = vi.mocked(useBrowseConfig);

describe('useLimiter', () => {
  // `emails` is declared first on purpose: a limit that throws while registering takes
  // every limit after it down too, so waiting on `members` is what catches that
  const limits = { emails: { maxPeriodic: 100 }, members: { max: 100 } };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderLimiter = async (hostSettings: Record<string, unknown>) => {
    mockUseBrowseConfig.mockReturnValue({ data: { config: { hostSettings } } } as ReturnType<
      typeof useBrowseConfig
    >);

    const { result } = renderHook(() => useLimiter());

    // The limit service is imported lazily, so the hook hands back a no-op until it lands
    await waitFor(() => expect(result.current.isLimited('members')).toBe(true));

    return result.current;
  };

  it('registers a periodic limit when a subscription anchors the period', async () => {
    const limiter = await renderLimiter({
      limits,
      subscription: { start: '2026-08-21T04:16:53.000Z' },
    });

    expect(limiter.isLimited('emails')).toBe(true);
  });

  it('skips a periodic limit when no subscription anchors the period', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const limiter = await renderLimiter({ limits });

    expect(limiter.isLimited('emails')).toBe(false);

    warn.mockRestore();
  });

  it('treats a subscription without a start as no subscription at all', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const limiter = await renderLimiter({ limits, subscription: {} });

    expect(limiter.isLimited('emails')).toBe(false);

    warn.mockRestore();
  });
});
