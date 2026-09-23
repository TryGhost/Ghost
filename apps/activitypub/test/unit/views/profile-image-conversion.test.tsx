import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Resolver queues keyed by image URL, so each conversion fetch can complete on
// demand — that is what makes the race below deterministic.
const pendingFetches: Record<string, Array<(value: string | null) => void>> = {};

vi.mock('@src/utils/image', () => ({
  imageUrlToDataUrl: vi.fn(
    (url: string) =>
      new Promise<string | null>((resolve) => {
        (pendingFetches[url] ??= []).push(resolve);
      }),
  ),
}));

vi.mock('@tryghost/admin-x-framework/api/site', () => ({
  useBrowseSite: () => ({ data: { site: { accent_color: '#ff0000' } } }),
}));

import Profile from '../../../src/views/preferences/components/profile';
import type { Account } from '../../../src/api/activitypub';

const makeAccount = (bannerUrl: string, avatarUrl: string) =>
  ({
    name: 'Test User',
    handle: '@test@example.com',
    bannerImageUrl: bannerUrl,
    avatarUrl,
  }) as unknown as Account;

const copyButton = () => screen.getByRole('button', { name: /copy image/i });
const isCopyDisabled = () => (copyButton() as HTMLButtonElement).disabled;

const resolveFetch = (url: string, value: string | null) => {
  const resolve = pendingFetches[url]?.shift();
  if (!resolve) {
    throw new Error(`no pending fetch for ${url}`);
  }
  resolve(value);
};

// Resolves the fetch only if the run under test actually started one. A fixed
// (stale) run bails before requesting its avatar, an unfixed one goes on to
// start it — either way the stale run gets to run to completion below.
const resolveFetchIfPending = (url: string, value: string | null) => {
  if (pendingFetches[url]?.length) {
    resolveFetch(url, value);
  }
};

const flush = async () => {
  // The conversion runs apply state from promise callbacks; wrapping the
  // microtask drain in `act` makes React process those updates before the
  // assertions run.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

// Renders Profile behind a harness that owns the account in state, so the test
// can swap the image URLs with a plain state update: the Profile's props change
// in place (the conversion effect re-runs) instead of the component remounting,
// which would orphan the first run and make the race untestable.
const mountProfile = (account: Account) => {
  let setAccount: (next: Account) => void = () => {};
  const AccountHarness = () => {
    const [current, setCurrent] = useState(account);
    setAccount = setCurrent;
    return <Profile account={current} isLoading={false} />;
  };
  const router = createMemoryRouter([{ path: '/', element: <AccountHarness /> }]);
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return (nextAccount: Account) => act(() => setAccount(nextAccount));
};

describe('Profile image conversion', () => {
  beforeEach(() => {
    for (const key of Object.keys(pendingFetches)) {
      delete pendingFetches[key];
    }
    vi.clearAllMocks();
  });

  it('keeps the copy guard up when a stale conversion run finishes late', async () => {
    // https://github.com/TryGhost/Ghost/issues/24600 — the copy button must
    // stay disabled until the *current* conversion run finishes, not just
    // until any run finishes.
    const changeAccount = mountProfile(
      makeAccount('https://example.com/banner-1.png', 'https://example.com/avatar-1.png'),
    );

    // The mount run is in flight (its banner fetch is pending).
    expect(isCopyDisabled()).toBe(true);

    // The image URLs change while the first run is still awaiting its
    // fetch: the effect starts a second run.
    changeAccount(
      makeAccount('https://example.com/banner-2.png', 'https://example.com/avatar-2.png'),
    );

    // Let the stale run run to completion. It must be dropped entirely:
    // with the bug it goes on to start and finish its avatar fetch and
    // then clears the guard; with the fix it exits at the banner check
    // and never starts the avatar fetch.
    resolveFetch('https://example.com/banner-1.png', 'data:stale-banner');
    await flush();
    resolveFetchIfPending('https://example.com/avatar-1.png', 'data:stale-avatar');
    await flush();

    expect(isCopyDisabled()).toBe(true);

    // The current run finishes: banner first, then its avatar fetch, and
    // only now may the guard clear.
    resolveFetch('https://example.com/banner-2.png', 'data:fresh-banner');
    await flush();
    resolveFetchIfPending('https://example.com/avatar-2.png', 'data:fresh-avatar');
    await flush();

    await waitFor(() => {
      expect(isCopyDisabled()).toBe(false);
    });
  });
});
