import { expect, test } from '@playwright/test';
import { mockApi } from '@tryghost/admin-x-framework/test/acceptance';
import { mockInitialApiRequests } from '../utils/initial-api-requests';

const account = {
  id: 'index',
  handle: '@index@site.com',
  name: 'Test User',
  url: 'https://site.com/',
  avatarUrl: 'https://site.com/avatar.jpg',
  followingCount: 1,
  followerCount: 10,
  likedCount: 0,
  blueskyEnabled: true,
  blueskyHandleConfirmed: true,
};

function getMyAccount(blueskyDetails: object) {
  return {
    method: 'GET',
    path: '/v1/account/me',
    response: { ...account, ...blueskyDetails },
  } as const;
}

function blueskyResponse(handle: string, domainHandle: object | null) {
  return {
    enabled: true,
    handleConfirmed: true,
    handle,
    domainHandle,
  };
}

test.describe('Bluesky sharing', async () => {
  test.beforeEach(async ({ page }) => {
    await mockInitialApiRequests(page);
  });

  test('My domain is set up as my Bluesky handle when I open Bluesky sharing', async ({ page }) => {
    const { lastApiRequests } = await mockApi({
      page,
      requests: {
        getMyAccount: getMyAccount({
          blueskyHandle: 'index.site.com.ap.brid.gy',
          blueskyDomainHandle: null,
        }),
        confirmBlueskyHandle: {
          method: 'POST',
          path: '/v2/actions/bluesky/confirm-handle',
          response: blueskyResponse('index.site.com.ap.brid.gy', {
            domain: 'site.com',
            status: 'claiming',
            reason: null,
          }),
        },
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/preferences/bluesky-sharing');

    await expect.poll(() => lastApiRequests.confirmBlueskyHandle).toBeTruthy();
    await expect(page.getByText('Switching your Bluesky handle to @site.com...')).toBeVisible();
  });

  test('I can switch back to the default Bluesky handle', async ({ page }) => {
    const { lastApiRequests } = await mockApi({
      page,
      requests: {
        getMyAccount: getMyAccount({
          blueskyHandle: 'site.com',
          blueskyDomainHandle: { domain: 'site.com', status: 'active', reason: null },
        }),
        resetBlueskyHandle: {
          method: 'DELETE',
          path: '/v2/actions/bluesky/domain-handle',
          response: blueskyResponse('site.com', {
            domain: 'site.com',
            status: 'opted_out',
            reason: null,
          }),
        },
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/preferences/bluesky-sharing');

    await expect(page.getByText("Your site's domain is your Bluesky handle.")).toBeVisible();

    await page.getByRole('button', { name: 'Use the default handle instead' }).click();
    await page.getByRole('button', { name: 'Use default handle' }).click();

    await expect.poll(() => lastApiRequests.resetBlueskyHandle).toBeTruthy();
    await expect(page.getByRole('button', { name: 'Use @site.com as your handle' })).toBeVisible();
  });

  test('I can see why my domain is not my Bluesky handle and try again', async ({ page }) => {
    const { lastApiRequests } = await mockApi({
      page,
      requests: {
        getMyAccount: getMyAccount({
          blueskyHandle: 'index.site.com.ap.brid.gy',
          blueskyDomainHandle: { domain: 'site.com', status: 'unavailable', reason: 'taken' },
        }),
        claimBlueskyDomainHandle: {
          method: 'POST',
          path: '/v2/actions/bluesky/domain-handle',
          response: blueskyResponse('index.site.com.ap.brid.gy', {
            domain: 'site.com',
            status: 'claiming',
            reason: null,
          }),
        },
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/preferences/bluesky-sharing');

    await expect(
      page.getByText('@site.com is already used by another Bluesky account', { exact: false }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Try again' }).click();

    await expect.poll(() => lastApiRequests.claimBlueskyDomainHandle).toBeTruthy();
    await expect(page.getByText('Switching your Bluesky handle to @site.com...')).toBeVisible();
  });
});
