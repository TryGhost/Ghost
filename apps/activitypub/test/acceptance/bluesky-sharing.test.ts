import { expect, test } from '@playwright/test';
import { mockApi } from '@tryghost/admin-x-framework/test/acceptance';
import { mockInitialApiRequests } from '../utils/initial-api-requests';

const DEFAULT_HANDLE = 'index.site.com.ap.brid.gy';

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

function domainHandle(status: string, automatic: boolean, reason: string | null = null) {
  return { domain: 'site.com', status, reason, automatic };
}

function blueskyResponse(handle: string, details: object | null) {
  return {
    enabled: true,
    handleConfirmed: true,
    handle,
    domainHandle: details,
  };
}

const BETTER_HANDLE = 'A better handle is available';

test.describe('Bluesky sharing', async () => {
  test.beforeEach(async ({ page }) => {
    await mockInitialApiRequests(page);
  });

  test.describe('Enabling', async () => {
    test('I can enable Bluesky sharing without choosing a handle', async ({ page }) => {
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

      await expect(page.getByRole('button', { name: 'Enable Bluesky sharing' })).toBeVisible();
      await expect(page.getByText('Your Bluesky handle will be')).toHaveCount(0);
      await expect(page.getByText("You can't change your Bluesky username")).toHaveCount(0);
    });

    test('Enabling is one step while my domain is set up as my handle', async ({ page }) => {
      await page.clock.install();

      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: domainHandle('claiming', true),
          }),
          confirmBlueskyHandle: {
            method: 'POST',
            path: '/v2/actions/bluesky/confirm-handle',
            response: blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', true)),
          },
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText('Enabling Bluesky sharing...')).toBeVisible();
      await expect(page.getByText(DEFAULT_HANDLE)).toHaveCount(0);
      await expect.poll(() => lastApiRequests.confirmBlueskyHandle).toBeTruthy();

      // Bluesky can be slow: after about two minutes of checks, sharing shows
      // as enabled on the handle it has so far
      await page.clock.runFor(5000 * 30);

      await expect(page.getByText(DEFAULT_HANDLE)).toBeVisible();
      await expect(page.getByText(BETTER_HANDLE)).toHaveCount(0);
    });

    test('I see my domain as my Bluesky handle', async ({ page }) => {
      await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: 'site.com',
            blueskyDomainHandle: domainHandle('active', true),
          }),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText('site.com', { exact: true })).toBeVisible();
      await expect(page.getByText(BETTER_HANDLE)).toHaveCount(0);
      await expect(page.getByText(/default handle/i)).toHaveCount(0);
    });

    test('I can see how to use my domain when another Bluesky account uses it', async ({
      page,
    }) => {
      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: domainHandle('unavailable', true, 'taken'),
          }),
          claimBlueskyDomainHandle: {
            method: 'POST',
            path: '/v2/actions/bluesky/domain-handle',
            response: blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', false)),
          },
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(BETTER_HANDLE)).toBeVisible();
      await expect(
        page.getByText(
          '@site.com is used by another Bluesky account. Remove it there, then try again.',
        ),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Try again' }).click();

      await expect.poll(() => lastApiRequests.claimBlueskyDomainHandle).toBeTruthy();
      await expect(page.getByText('Switching...')).toBeVisible();
    });

    test("I'm not told about a domain handle I can't do anything about", async ({ page }) => {
      await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: domainHandle('unavailable', true, 'not_reachable'),
          }),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(DEFAULT_HANDLE)).toBeVisible();
      await expect(page.getByText(BETTER_HANDLE)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    });
  });

  test.describe('Already enabled before domain handles', async () => {
    test('Nothing changes when I open Bluesky sharing, and I can use my domain', async ({
      page,
    }) => {
      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: null,
          }),
          // Answers checks once the publisher has asked for the domain
          confirmBlueskyHandle: {
            method: 'POST',
            path: '/v2/actions/bluesky/confirm-handle',
            response: blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', false)),
          },
          claimBlueskyDomainHandle: {
            method: 'POST',
            path: '/v2/actions/bluesky/domain-handle',
            response: blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', false)),
          },
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(BETTER_HANDLE)).toBeVisible();
      await expect(
        page.getByText("Use your site's domain, @site.com, as your Bluesky handle."),
      ).toBeVisible();
      await page.waitForTimeout(1000);
      expect(lastApiRequests.confirmBlueskyHandle).toBeUndefined();
      expect(lastApiRequests.claimBlueskyDomainHandle).toBeUndefined();

      await page.getByRole('button', { name: 'Use domain handle' }).click();

      await expect.poll(() => lastApiRequests.claimBlueskyDomainHandle).toBeTruthy();
      await expect(page.getByText('Switching...')).toBeVisible();
    });

    test('I can check again when Bluesky takes a while to switch my handle', async ({ page }) => {
      await page.clock.install();

      await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: domainHandle('claiming', false),
          }),
          confirmBlueskyHandle: {
            method: 'POST',
            path: '/v2/actions/bluesky/confirm-handle',
            response: blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', false)),
          },
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');
      await expect(page.getByText('Switching...')).toBeVisible();

      // The screen checks every 5 seconds for about two minutes
      await page.clock.runFor(5000 * 30);

      await expect(page.getByText('Switching to @site.com can take a few minutes.')).toBeVisible();

      await page.getByRole('button', { name: 'Check again' }).click();

      await expect(page.getByText('Switching...')).toBeVisible();
    });

    test('The callout goes away once my domain is my handle', async ({ page }) => {
      await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: 'site.com',
            blueskyDomainHandle: domainHandle('active', false),
          }),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText('site.com', { exact: true })).toBeVisible();
      await expect(page.getByText(BETTER_HANDLE)).toHaveCount(0);
    });
  });

  test.describe('Older ActivityPub services', async () => {
    test('I see the current Bluesky handle behaviour', async ({ page }) => {
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
    });

    test('I am not offered a domain handle', async ({ page }) => {
      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({ blueskyHandle: DEFAULT_HANDLE }),
          confirmBlueskyHandle: {
            method: 'POST',
            path: '/v2/actions/bluesky/confirm-handle',
            response: { enabled: true, handleConfirmed: true, handle: DEFAULT_HANDLE },
          },
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(DEFAULT_HANDLE)).toBeVisible();
      await page.waitForTimeout(1000);

      expect(lastApiRequests.confirmBlueskyHandle).toBeUndefined();
      await expect(page.getByText(BETTER_HANDLE)).toHaveCount(0);
    });
  });
});
