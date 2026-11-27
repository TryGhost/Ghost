import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePrivateSiteLogin } from './use-private-site-login';

vi.mock('@tryghost/admin-x-framework/api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework/api/settings')>()),
  useBrowseSettings: vi.fn(),
}));
vi.mock('@tryghost/admin-x-framework/api/site', () => ({
  useBrowseSite: vi.fn(),
}));

const { useBrowseSettings } = vi.mocked(await import('@tryghost/admin-x-framework/api/settings'));
const { useBrowseSite } = vi.mocked(await import('@tryghost/admin-x-framework/api/site'));

function mockSettings(settings: Record<string, unknown> | undefined) {
  useBrowseSettings.mockReturnValue({
    data: settings && {
      settings: Object.entries(settings).map(([key, value]) => ({ key, value })),
    },
  } as unknown as ReturnType<typeof useBrowseSettings>);
}

function mockSiteUrl(url: string) {
  useBrowseSite.mockReturnValue({
    data: { site: { url } },
  } as unknown as ReturnType<typeof useBrowseSite>);
}

describe('usePrivateSiteLogin', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response(null));
    vi.stubGlobal('fetch', fetchMock);
    mockSiteUrl('https://example.com/blog/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the site password to the private login route', async () => {
    mockSettings({ is_private: true, password: 'a&b c' });

    renderHook(() => usePrivateSiteLogin());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect((url as URL).href).toBe('https://example.com/blog/private/?r=%2F');
    expect(init).toMatchObject({ method: 'POST', credentials: 'include', redirect: 'manual' });
    expect((init?.body as URLSearchParams).toString()).toBe('password=a%26b+c');
  });

  it('handles a site URL without a trailing slash', async () => {
    mockSiteUrl('https://example.com');
    mockSettings({ is_private: true, password: 'secret' });

    renderHook(() => usePrivateSiteLogin());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect((fetchMock.mock.calls[0][0] as URL).href).toBe('https://example.com/private/?r=%2F');
  });

  it('posts once per page load across re-renders and setting changes', async () => {
    mockSettings({ is_private: true, password: 'secret' });
    const { rerender } = renderHook(() => usePrivateSiteLogin());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    mockSettings({ is_private: true, password: 'changed' });
    rerender();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a public site', () => {
    mockSettings({ is_private: false, password: 'secret' });

    renderHook(() => usePrivateSiteLogin());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing for a private site without a password', () => {
    mockSettings({ is_private: true, password: null });

    renderHook(() => usePrivateSiteLogin());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits for settings to load before deciding', async () => {
    mockSettings(undefined);
    const { rerender } = renderHook(() => usePrivateSiteLogin());
    expect(fetchMock).not.toHaveBeenCalled();

    mockSettings({ is_private: true, password: 'secret' });
    rerender();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('swallows a failed login request', async () => {
    let calls = 0;
    // A plain function: a vi.fn() would observe the rejection and mark it handled.
    vi.stubGlobal('fetch', () => {
      calls += 1;
      return Promise.reject(new TypeError('Failed to fetch'));
    });
    mockSettings({ is_private: true, password: 'secret' });

    renderHook(() => usePrivateSiteLogin());

    await waitFor(() => expect(calls).toBe(1));
    // Vitest fails the run on an unhandled rejection; give one the chance to surface.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
});
