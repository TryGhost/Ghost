import { renderHook } from '@testing-library/react';
import { HostLimitError } from '../../../src/utils/errors';
import { useLimiter } from '../../../src/hooks/use-limiter';

const { fetchApi, fetchAutomations } = vi.hoisted(() => ({
  fetchApi: vi.fn(),
  fetchAutomations: vi.fn(),
}));

vi.mock('../../../src/api/automations', () => ({
  useBrowseAutomations: vi.fn(() => ({ refetch: fetchAutomations })),
}));

vi.mock('../../../src/api/config', () => ({ useBrowseConfig: vi.fn() }));
vi.mock('../../../src/api/users', () => ({
  useBrowseUsers: vi.fn(() => ({ data: { users: [] }, isLoading: false })),
}));
vi.mock('../../../src/api/invites', () => ({
  useBrowseInvites: vi.fn(() => ({ data: { invites: [] }, isLoading: false })),
}));
vi.mock('../../../src/api/roles', () => ({
  useBrowseRoles: vi.fn(() => ({ data: { roles: [] }, isLoading: false })),
}));
vi.mock('../../../src/api/members', () => ({ useBrowseMembers: () => ({ refetch: vi.fn() }) }));
vi.mock('../../../src/api/newsletters', () => ({
  useBrowseNewsletters: () => ({ refetch: vi.fn() }),
}));
vi.mock('../../../src/utils/api/fetch-api', () => ({
  useFetchApi: () => fetchApi,
  apiUrl: (path: string, params: Record<string, string>) =>
    `${path}?${new URLSearchParams(params).toString()}`,
}));

import { useBrowseAutomations } from '../../../src/api/automations';
import { useBrowseConfig } from '../../../src/api/config';
import { useBrowseInvites } from '../../../src/api/invites';
import { useBrowseRoles } from '../../../src/api/roles';
import { useBrowseUsers } from '../../../src/api/users';

const withHostSettings = (hostSettings: unknown) => {
  vi.mocked(useBrowseConfig).mockReturnValue({
    data: { config: { hostSettings } },
  } as ReturnType<typeof useBrowseConfig>);
};

const SUBSCRIPTION = { start: '2026-09-01T00:00:00.000Z' };
const EMAILS_LIMIT = {
  maxPeriodic: 300,
  error: 'Your plan allows {{max}} email recipients a month, please upgrade to send more.',
};

describe('useLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    fetchApi.mockReset();
    fetchAutomations.mockReset();
  });

  it.each([0, 2])('blocks activation at the active automation cap of %s', async (max) => {
    withHostSettings({ limits: { limitAutomations: { max } } });
    fetchAutomations.mockResolvedValue({
      data: {
        automations: [
          ...Array.from({ length: max }, (_, i) => ({ id: `active-${i}`, status: 'active' })),
          { id: 'draft', status: 'inactive' },
        ],
      },
    });
    const { result } = renderHook(() => useLimiter({ limits: ['limitAutomations'] }));
    await expect(result.current.errorIfWouldGoOverLimit('limitAutomations')).rejects.toBeInstanceOf(
      HostLimitError,
    );
    expect(fetchAutomations).toHaveBeenCalledWith({ throwOnError: true });
    expect(useBrowseAutomations).toHaveBeenCalledWith({
      enabled: false,
      requestOptions: undefined,
    });
  });

  it('counts active automations only', async () => {
    withHostSettings({ limits: { limitAutomations: { max: 2 } } });
    fetchAutomations.mockResolvedValue({
      data: { automations: [{ status: 'active' }, { status: 'inactive' }, { status: 'inactive' }] },
    });
    const { result } = renderHook(() => useLimiter({ limits: ['limitAutomations'] }));
    await expect(
      result.current.errorIfWouldGoOverLimit('limitAutomations'),
    ).resolves.toBeUndefined();
  });

  it('propagates automation count read failures', async () => {
    withHostSettings({ limits: { limitAutomations: { max: 2 } } });
    fetchAutomations.mockRejectedValue(new Error('Count unavailable'));
    const { result } = renderHook(() => useLimiter({ limits: ['limitAutomations'] }));
    await expect(result.current.errorIfWouldGoOverLimit('limitAutomations')).rejects.toThrow(
      'Count unavailable',
    );
  });

  it('rejects an automation count response without data', async () => {
    withHostSettings({ limits: { limitAutomations: { max: 2 } } });
    fetchAutomations.mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useLimiter({ limits: ['limitAutomations'] }));
    await expect(result.current.errorIfWouldGoOverLimit('limitAutomations')).rejects.toThrow(
      'Failed to fetch automation count.',
    );
  });

  it('passes request options to the disabled automation query', () => {
    withHostSettings({ limits: { limitAutomations: { max: 2 } } });
    renderHook(() =>
      useLimiter({
        limits: ['limitAutomations'],
        requestOptions: { sessionExpiryRedirect: false },
      }),
    );
    expect(useBrowseAutomations).toHaveBeenCalledWith({
      enabled: false,
      requestOptions: { sessionExpiryRedirect: false },
    });
    expect(fetchAutomations).not.toHaveBeenCalled();
  });

  it('does not fetch automation counts without the host limit', async () => {
    withHostSettings({ limits: {} });
    const { result } = renderHook(() => useLimiter({ limits: ['limitAutomations'] }));
    await expect(
      result.current.errorIfWouldGoOverLimit('limitAutomations'),
    ).resolves.toBeUndefined();
    expect(fetchAutomations).not.toHaveBeenCalled();
  });

  it('loads periodic limits when the host sets a subscription start', () => {
    withHostSettings({
      subscription: SUBSCRIPTION,
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

  it('reads the staff lists for every limit by default', () => {
    withHostSettings({ limits: { staff: { max: 5 } } });

    const { result } = renderHook(() => useLimiter());

    expect(result.current.isLimited('staff')).toBe(true);
    expect(useBrowseUsers).toHaveBeenCalledWith({ enabled: true });
    expect(useBrowseInvites).toHaveBeenCalledWith({ enabled: true });
    expect(useBrowseRoles).toHaveBeenCalledWith({ enabled: true });
  });

  it('loads only the limits a caller names and leaves the staff lists unread', () => {
    withHostSettings({
      subscription: SUBSCRIPTION,
      limits: { staff: { max: 5 }, members: { max: 500 }, emails: EMAILS_LIMIT },
    });

    const { result } = renderHook(() => useLimiter({ limits: ['members', 'emails'] }));

    expect(result.current.isLimited('members')).toBe(true);
    expect(result.current.isLimited('emails')).toBe(true);
    expect(result.current.isLimited('staff')).toBe(false);
    expect(useBrowseUsers).toHaveBeenCalledWith({ enabled: false });
    expect(useBrowseInvites).toHaveBeenCalledWith({ enabled: false });
    expect(useBrowseRoles).toHaveBeenCalledWith({ enabled: false });
  });

  it('counts the recipients emailed since the period started against the emails limit', async () => {
    withHostSettings({ subscription: SUBSCRIPTION, limits: { emails: EMAILS_LIMIT } });
    fetchApi.mockResolvedValue({
      emails: [
        { id: 'email-a', email_count: 200 },
        { id: 'email-b', email_count: 100 },
      ],
    });

    const { result } = renderHook(() =>
      useLimiter({ limits: ['emails'], requestOptions: { sessionExpiryRedirect: false } }),
    );

    await expect(result.current.errorIfWouldGoOverLimit('emails')).rejects.toThrow(
      'Your plan allows 300 email recipients a month, please upgrade to send more.',
    );

    const [url, options] = fetchApi.mock.calls[0];
    const params = new URL(url, 'http://localhost').searchParams;
    expect(url).toMatch(/^\/emails\/\?/);
    expect(params.get('filter')).toMatch(/^created_at:>='\d{4}-\d{2}-\d{2}T[\d:.]+Z'$/);
    expect(params.get('fields')).toBe('id,email_count');
    expect(params.get('limit')).toBe('all');
    expect(options).toEqual({ sessionExpiryRedirect: false });
  });

  it.each([
    ['mid-period', '2026-09-25T12:00:00.000Z', '2026-09-15T09:30:00.000Z'],
    ['on the period boundary', '2026-09-15T09:30:00.000Z', '2026-09-15T09:30:00.000Z'],
  ])('counts emails from the subscription-anchored period start %s', async (_, now, since) => {
    vi.setSystemTime(new Date(now));
    withHostSettings({
      subscription: { start: '2026-03-15T09:30:00.000Z' },
      limits: { emails: EMAILS_LIMIT },
    });
    fetchApi.mockResolvedValue({ emails: [] });

    const { result } = renderHook(() => useLimiter({ limits: ['emails'] }));
    await result.current.errorIfWouldGoOverLimit('emails');

    const params = new URL(fetchApi.mock.calls[0][0], 'http://localhost').searchParams;
    expect(params.get('filter')).toBe(`created_at:>='${since}'`);
  });

  it('allows a send while the recipients emailed this period stay under the limit', async () => {
    withHostSettings({ subscription: SUBSCRIPTION, limits: { emails: EMAILS_LIMIT } });
    fetchApi.mockResolvedValue({ emails: [{ id: 'email-a', email_count: 100 }] });

    const { result } = renderHook(() => useLimiter({ limits: ['emails'] }));

    await expect(result.current.errorIfWouldGoOverLimit('emails')).resolves.toBeUndefined();
  });
});
