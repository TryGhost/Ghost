/**
 * @vitest-environment jsdom
 */
import React, { act } from 'react';
import Profile from '../../../src/views/preferences/components/profile';
import type { Account } from '../../../src/api/activitypub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Silence React's "not configured to support act(...)" warnings for the
// explicit act() calls below (render/fireEvent are already act-wrapped)
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

vi.mock('@tryghost/admin-x-framework/api/site', () => ({
  useBrowseSite: () => ({
    data: {
      site: {
        accent_color: '#15171a',
        cover_image: undefined,
        icon: undefined,
        title: 'Test Site',
      },
    },
  }),
}));

vi.mock('@tryghost/shade/components', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  LoadingIndicator: () => null,
  Skeleton: () => null,
  ToggleGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ToggleGroupItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@tryghost/shade/primitives', () => ({
  H2: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@tryghost/shade/utils', () => ({
  LucideIcon: new Proxy({}, { get: () => () => null }),
}));

vi.mock('@src/components/global/ap-avatar', () => ({
  default: () => null,
}));

vi.mock('../../../src/views/preferences/components/dots-pattern', () => ({
  default: () => null,
}));

vi.mock('@src/utils/screenshot', () => ({
  fixFirefoxTextSpacing: () => {},
}));

vi.mock('html2canvas-pro', () => ({
  default: vi.fn(),
}));

vi.mock('@src/api/activitypub', () => ({}));

const makeAccount = (suffix: string): Account => ({
  id: `id-${suffix}`,
  apId: `https://example.com/${suffix}`,
  name: `Test ${suffix}`,
  handle: `@test-${suffix}`,
  bio: '',
  url: `https://example.com/${suffix}`,
  avatarUrl: `https://cdn.example.com/${suffix}/avatar.png`,
  bannerImageUrl: `https://cdn.example.com/${suffix}/banner.png`,
  customFields: {},
  postCount: 0,
  likedCount: 0,
  followingCount: 0,
  followerCount: 0,
  followsMe: false,
  followedByMe: false,
  blockedByMe: false,
  domainBlockedByMe: false,
  attachment: [],
});

type Deferred = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

describe('Profile image conversion', function () {
  const fetchMock = vi.fn();
  // Fetch calls are held back per URL so the test controls the order in
  // which conversions complete
  const deferredByUrl = new Map<string, Deferred[]>();

  const resolveFetch = async (url: string) => {
    const deferred = deferredByUrl.get(url)?.shift();
    if (!deferred) {
      throw new Error(`No pending fetch for ${url}`);
    }
    await act(async () => {
      deferred.resolve({
        ok: true,
        // The blob holds the URL itself, so each conversion produces a
        // distinct, recognizable data URL
        blob: async () => new Blob([url], { type: 'image/png' }),
      });
      await Promise.resolve();
    });
  };

  const dataUrlFor = (url: string) => `data:image/png;base64,${btoa(url)}`;

  const imageSources = () =>
    Array.from(document.querySelectorAll('img')).map((img) => img.getAttribute('src'));

  beforeEach(function () {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    deferredByUrl.clear();
    fetchMock.mockImplementation((url: string) => {
      return new Promise((resolve, reject) => {
        const queue = deferredByUrl.get(url) ?? [];
        queue.push({ resolve, reject });
        deferredByUrl.set(url, queue);
      });
    });
  });

  afterEach(function () {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('ignores a superseded conversion: a slow first run does not overwrite the second run', async function () {
    const accountOne = makeAccount('one');
    const accountTwo = makeAccount('two');
    const { rerender } = render(<Profile account={accountOne} isLoading={false} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(accountOne.bannerImageUrl, { mode: 'cors' });
    });

    // A new account starts a second conversion while the first is still
    // waiting on its banner fetch
    rerender(<Profile account={accountTwo} isLoading={false} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(accountTwo.bannerImageUrl, { mode: 'cors' });
    });

    // Finish the second run first, then let the first run complete
    await resolveFetch(accountTwo.bannerImageUrl!);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(accountTwo.avatarUrl, { mode: 'cors' });
    });
    await resolveFetch(accountTwo.avatarUrl);
    await resolveFetch(accountOne.bannerImageUrl!);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(accountOne.avatarUrl, { mode: 'cors' });
    });
    await resolveFetch(accountOne.avatarUrl);

    // Let any pending FileReader work and state updates flush
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    });

    expect(imageSources()).toContain(dataUrlFor(accountTwo.bannerImageUrl!));
    expect(imageSources()).not.toContain(dataUrlFor(accountOne.bannerImageUrl!));
  });

  it('shows a generic failure message without blaming CORS when the copy is blocked', async function () {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<Profile account={makeAccount('one')} isLoading={false} />);

    // Both images fail twice (first attempt + one retry each)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    });

    fireEvent.click(screen.getByText('Copy image'));

    expect(toastMocks.error).toHaveBeenCalledWith(
      'Could not load the profile or cover image. Check that the image is reachable and try again.',
    );
    expect(toastMocks.error.mock.calls[0][0]).not.toContain('CORS');
  });
});
