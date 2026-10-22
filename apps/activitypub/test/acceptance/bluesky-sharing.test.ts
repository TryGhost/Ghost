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

  test('I see that my domain will be my Bluesky handle before enabling', async ({ page }) => {
    await mockApi({
      page,
      requests: {
        getMyAccount: getMyAccount({
          blueskyEnabled: false,
          blueskyHandleConfirmed: false,
          blueskyHandle: null,
          blueskyDomainHandle: null,
        }),
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/preferences/bluesky-sharing');

    await expect(page.getByText('Your Bluesky handle will be @site.com')).toBeVisible();
    await expect(page.getByText("You can't change your Bluesky username")).toHaveCount(0);
  });

  test('I see the current Bluesky handle behaviour with an older ActivityPub service', async ({
    page,
  }) => {
    // Older services leave blueskyDomainHandle out of the account
    await mockApi({
      page,
      requests: {
        getMyAccount: getMyAccount({
          blueskyEnabled: false,
          blueskyHandleConfirmed: false,
          blueskyHandle: null,
        }),
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/preferences/bluesky-sharing');

    await expect(page.getByText("You can't change your Bluesky username")).toBeVisible();
    await expect(page.getByText('Your Bluesky handle will be')).toHaveCount(0);
  });

  test('My Bluesky handle is not checked again with an older ActivityPub service', async ({
    page,
  }) => {
    const { lastApiRequests } = await mockApi({
      page,
      requests: {
        getMyAccount: getMyAccount({ blueskyHandle: 'index.site.com.ap.brid.gy' }),
        confirmBlueskyHandle: {
          method: 'POST',
          path: '/v2/actions/bluesky/confirm-handle',
          response: { enabled: true, handleConfirmed: true, handle: 'index.site.com.ap.brid.gy' },
        },
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/preferences/bluesky-sharing');

    await expect(page.getByText('index.site.com.ap.brid.gy')).toBeVisible();
    await page.waitForTimeout(1000);

    expect(lastApiRequests.confirmBlueskyHandle).toBeUndefined();
    await expect(page.getByText('Switching your Bluesky handle')).toHaveCount(0);
  });

  test('I can check again when Bluesky takes a while to switch my handle', async ({ page }) => {
    await page.clock.install();

    const claiming = { domain: 'site.com', status: 'claiming', reason: null };

    await mockApi({
      page,
      requests: {
        getMyAccount: getMyAccount({
          blueskyHandle: 'index.site.com.ap.brid.gy',
          blueskyDomainHandle: claiming,
        }),
        confirmBlueskyHandle: {
          method: 'POST',
          path: '/v2/actions/bluesky/confirm-handle',
          response: blueskyResponse('index.site.com.ap.brid.gy', claiming),
        },
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/preferences/bluesky-sharing');
    await expect(page.getByText('Switching your Bluesky handle to @site.com...')).toBeVisible();

    // The screen checks every 5 seconds for about two minutes
    await page.clock.runFor(5000 * 30);

    await expect(
      page.getByText("Bluesky hasn't switched your handle to @site.com yet."),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Check again' }).click();

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
