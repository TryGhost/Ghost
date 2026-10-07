import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const makeAccount = (n: number) =>
  ({
    name: 'Test User',
    handle: '@test@example.com',
    bannerImageUrl: `https://example.com/banner-${n}.png`,
    avatarUrl: `https://example.com/avatar-${n}.png`,
  }) as unknown as Account;

const isCopyDisabled = () =>
  (screen.getByRole('button', { name: /copy image/i }) as HTMLButtonElement).disabled;

const resolveFetch = async (url: string, value: string | null) => {
  await act(async () => {
    pendingFetches[url]?.shift()?.(value);
  });
};

describe('Profile image conversion', () => {
  beforeEach(() => {
    for (const key of Object.keys(pendingFetches)) {
      delete pendingFetches[key];
    }
  });

  it('keeps copy disabled until the latest conversion run finishes', async () => {
    let setAccount: (account: Account) => void = () => {};
    const Harness = () => {
      const [account, setCurrent] = useState(makeAccount(1));
      setAccount = setCurrent;
      return <Profile account={account} isLoading={false} />;
    };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={createMemoryRouter([{ path: '/', element: <Harness /> }])} />
      </QueryClientProvider>,
    );
    expect(isCopyDisabled()).toBe(true);

    act(() => setAccount(makeAccount(2)));

    await resolveFetch('https://example.com/banner-1.png', 'data:stale-banner');
    await resolveFetch('https://example.com/avatar-1.png', 'data:stale-avatar');
    expect(isCopyDisabled()).toBe(true);

    await resolveFetch('https://example.com/banner-2.png', 'data:fresh-banner');
    expect(isCopyDisabled()).toBe(true);

    await resolveFetch('https://example.com/avatar-2.png', 'data:fresh-avatar');
    expect(isCopyDisabled()).toBe(false);
  });
});
