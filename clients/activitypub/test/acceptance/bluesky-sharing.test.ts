import { expect, test, type Page } from '@playwright/test';
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

function claimBlueskyDomainHandle(response: object, responseStatus = 200) {
  return {
    method: 'POST',
    path: '/v2/actions/bluesky/domain-handle',
    response,
    responseStatus,
  } as const;
}

function confirmBlueskyHandle(response: object) {
  return {
    method: 'POST',
    path: '/v2/actions/bluesky/confirm-handle',
    response,
  } as const;
}

function checkBlueskyDomainHandle(available: boolean, domain = 'site.com') {
  return {
    method: 'POST',
    path: '/v2/actions/bluesky/domain-handle/check',
    response: { domain, available, reason: available ? null : 'not_reachable' },
  } as const;
}

const OFFER = 'Use @site.com as your Bluesky handle';
const SWITCHING = 'Switching to @site.com…';
const SWITCHED = 'Your Bluesky handle is now @site.com';
const TAKEN = '@site.com is already taken';
const FAILED = "Couldn't change to @site.com";

async function expectNoDomainHandleBanner(page: Page) {
  for (const title of [OFFER, SWITCHING, SWITCHED, TAKEN, FAILED]) {
    await expect(page.getByText(title)).toHaveCount(0);
  }
}

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
          confirmBlueskyHandle: confirmBlueskyHandle(
            blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', true)),
          ),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText('Enabling Bluesky sharing...')).toBeVisible();
      await expect(page.getByText(`@${DEFAULT_HANDLE}`)).toHaveCount(0);
      await expect.poll(() => lastApiRequests.confirmBlueskyHandle).toBeTruthy();

      // Bluesky can be slow: after about two minutes of checks, sharing shows
      // as enabled on the handle it has so far
      await page.clock.runFor(5000 * 30);

      await expect(page.getByText(`@${DEFAULT_HANDLE}`)).toBeVisible();
      await expectNoDomainHandleBanner(page);
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

      await expect(page.getByText('@site.com', { exact: true })).toBeVisible();
      await expectNoDomainHandleBanner(page);
    });

    // Whatever went wrong, including a domain that didn't reach the service
    // at the time, the domain is offered as long as it can work now
    for (const reason of ['taken', 'dns_error', 'rejected', 'not_reachable']) {
      test(`I'm offered my domain, without an error, when it couldn't be set up (${reason})`, async ({
        page,
      }) => {
        await mockApi({
          page,
          requests: {
            getMyAccount: getMyAccount({
              blueskyHandle: DEFAULT_HANDLE,
              blueskyDomainHandle: domainHandle('unavailable', true, reason),
            }),
            checkBlueskyDomainHandle: checkBlueskyDomainHandle(true),
          },
          options: { useActivityPub: true },
        });

        await page.goto('#/preferences/bluesky-sharing');

        await expect(page.getByText(`@${DEFAULT_HANDLE}`)).toBeVisible();
        await expect(page.getByText(OFFER)).toBeVisible();
        await expect(
          page.getByText('Your followers and posts stay exactly as they are.'),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Use @site.com' })).toBeVisible();
        await expect(page.getByText(TAKEN)).toHaveCount(0);
        await expect(page.getByText(FAILED)).toHaveCount(0);
      });
    }

    test("I'm told when another Bluesky account uses the domain I asked for", async ({ page }) => {
      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: domainHandle('unavailable', true, 'taken'),
          }),
          checkBlueskyDomainHandle: checkBlueskyDomainHandle(true),
          claimBlueskyDomainHandle: claimBlueskyDomainHandle(
            blueskyResponse(DEFAULT_HANDLE, domainHandle('unavailable', false, 'taken')),
          ),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');
      await page.getByRole('button', { name: 'Use @site.com' }).click();

      await expect.poll(() => lastApiRequests.claimBlueskyDomainHandle).toBeTruthy();
      await expect(page.getByText(TAKEN)).toBeVisible();
      await expect(
        page.getByText('Another Bluesky account is using @site.com as handle.'),
      ).toBeVisible();
      await expect(page.getByText(OFFER)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
      await expect(page.getByText(`@${DEFAULT_HANDLE}`)).toBeVisible();
    });

    test("I'm not offered a domain that doesn't reach the ActivityPub service", async ({
      page,
    }) => {
      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: domainHandle('unavailable', true, 'not_reachable'),
          }),
          checkBlueskyDomainHandle: checkBlueskyDomainHandle(false),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(`@${DEFAULT_HANDLE}`)).toBeVisible();
      await expect.poll(() => lastApiRequests.checkBlueskyDomainHandle).toBeTruthy();
      await expectNoDomainHandleBanner(page);
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
          checkBlueskyDomainHandle: checkBlueskyDomainHandle(true),
          // Answers checks once the publisher has asked for the domain
          confirmBlueskyHandle: confirmBlueskyHandle(
            blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', false)),
          ),
          claimBlueskyDomainHandle: claimBlueskyDomainHandle(
            blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', false)),
          ),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(OFFER)).toBeVisible();
      await page.waitForTimeout(1000);
      expect(lastApiRequests.confirmBlueskyHandle).toBeUndefined();
      expect(lastApiRequests.claimBlueskyDomainHandle).toBeUndefined();

      await page.getByRole('button', { name: 'Use @site.com' }).click();

      await expect.poll(() => lastApiRequests.claimBlueskyDomainHandle).toBeTruthy();
      await expect(page.getByText(SWITCHING)).toBeVisible();
      await expect(
        page.getByText('This can take a few minutes. You can leave this page and come back.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Use @site.com' })).toHaveCount(0);
    });

    test('I see my new handle once it has switched to my domain', async ({ page }) => {
      await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: null,
          }),
          checkBlueskyDomainHandle: checkBlueskyDomainHandle(true),
          confirmBlueskyHandle: confirmBlueskyHandle(
            blueskyResponse('site.com', domainHandle('active', false)),
          ),
          claimBlueskyDomainHandle: claimBlueskyDomainHandle(
            blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', false)),
          ),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');
      await page.getByRole('button', { name: 'Use @site.com' }).click();

      await expect(page.getByText(SWITCHED)).toBeVisible();
      await expect(
        page.getByText('Your followers and posts stayed exactly as they were.'),
      ).toBeVisible();
      await expect(page.getByText('@site.com', { exact: true })).toBeVisible();
      await expect(page.getByText(`@${DEFAULT_HANDLE}`)).toHaveCount(0);
    });

    test("I can try again when my handle couldn't be switched", async ({ page }) => {
      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: domainHandle('claiming', false),
          }),
          confirmBlueskyHandle: confirmBlueskyHandle(
            blueskyResponse(DEFAULT_HANDLE, domainHandle('unavailable', false, 'rejected')),
          ),
          claimBlueskyDomainHandle: claimBlueskyDomainHandle(
            blueskyResponse(DEFAULT_HANDLE, domainHandle('unavailable', false, 'dns_error')),
          ),
        },
        options: { useActivityPub: true },
      });

      // The switch was asked for on an earlier visit, and is given up on now
      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(FAILED)).toBeVisible();
      await expect(
        page.getByText('Something went wrong. Try again in a few minutes.'),
      ).toBeVisible();
      expect(lastApiRequests.claimBlueskyDomainHandle).toBeUndefined();

      await page.getByRole('button', { name: 'Try again' }).click();

      await expect.poll(() => lastApiRequests.claimBlueskyDomainHandle).toBeTruthy();
      await expect(page.getByText(FAILED)).toBeVisible();
    });

    test("I can try again when asking for my domain didn't work", async ({ page }) => {
      await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: null,
          }),
          checkBlueskyDomainHandle: checkBlueskyDomainHandle(true),
          claimBlueskyDomainHandle: claimBlueskyDomainHandle({ error: 'Something broke' }, 500),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');
      await page.getByRole('button', { name: 'Use @site.com' }).click();

      await expect(page.getByText(FAILED)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    });

    test("I can try again when my domain didn't reach the ActivityPub service this time", async ({
      page,
    }) => {
      await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: null,
          }),
          checkBlueskyDomainHandle: checkBlueskyDomainHandle(true),
          claimBlueskyDomainHandle: claimBlueskyDomainHandle(
            blueskyResponse(DEFAULT_HANDLE, domainHandle('unavailable', false, 'not_reachable')),
          ),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');
      await page.getByRole('button', { name: 'Use @site.com' }).click();

      await expect(page.getByText(FAILED)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    });

    test("I'm not offered my domain when it doesn't reach the ActivityPub service", async ({
      page,
    }) => {
      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: null,
          }),
          checkBlueskyDomainHandle: checkBlueskyDomainHandle(false),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(`@${DEFAULT_HANDLE}`)).toBeVisible();
      await expect.poll(() => lastApiRequests.checkBlueskyDomainHandle).toBeTruthy();
      await expectNoDomainHandleBanner(page);
    });

    test("I'm offered the domain that would become my handle when it isn't my main one", async ({
      page,
    }) => {
      await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({ blueskyHandle: DEFAULT_HANDLE, blueskyDomainHandle: null }),
          checkBlueskyDomainHandle: checkBlueskyDomainHandle(true, 'www.site.com'),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText('Use @www.site.com as your Bluesky handle')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Use @www.site.com' })).toBeVisible();
    });

    test("I'm not offered my domain when it can't be checked", async ({ page }) => {
      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: null,
          }),
          checkBlueskyDomainHandle: {
            ...checkBlueskyDomainHandle(true),
            response: { error: 'Something broke' },
            responseStatus: 500,
          },
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(`@${DEFAULT_HANDLE}`)).toBeVisible();
      await expect.poll(() => lastApiRequests.checkBlueskyDomainHandle).toBeTruthy();
      await expectNoDomainHandleBanner(page);
    });

    test('I keep seeing that my handle is switching when Bluesky takes a while', async ({
      page,
    }) => {
      await page.clock.install();

      const { lastApiRequests } = await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: domainHandle('claiming', false),
          }),
          confirmBlueskyHandle: confirmBlueskyHandle(
            blueskyResponse(DEFAULT_HANDLE, domainHandle('claiming', false)),
          ),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');
      await expect(page.getByText(SWITCHING)).toBeVisible();

      // The screen checks every 5 seconds for about two minutes, then slows down
      await page.clock.runFor(5000 * 30);

      await expect(page.getByText(SWITCHING)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Check again' })).toHaveCount(0);

      delete lastApiRequests.confirmBlueskyHandle;
      await page.clock.runFor(30000);

      await expect.poll(() => lastApiRequests.confirmBlueskyHandle).toBeTruthy();
    });

    test("I'm offered my domain again after a switch that didn't work on an earlier visit", async ({
      page,
    }) => {
      await mockApi({
        page,
        requests: {
          getMyAccount: getMyAccount({
            blueskyHandle: DEFAULT_HANDLE,
            blueskyDomainHandle: domainHandle('unavailable', false, 'taken'),
          }),
          checkBlueskyDomainHandle: checkBlueskyDomainHandle(true),
        },
        options: { useActivityPub: true },
      });

      await page.goto('#/preferences/bluesky-sharing');

      await expect(page.getByText(OFFER)).toBeVisible();
      await expect(page.getByText(TAKEN)).toHaveCount(0);
    });

    test("I'm not told about a switch that finished on an earlier visit", async ({ page }) => {
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

      await expect(page.getByText('@site.com', { exact: true })).toBeVisible();
      await expectNoDomainHandleBanner(page);
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

      await expect(page.getByText(`@${DEFAULT_HANDLE}`)).toBeVisible();
      await page.waitForTimeout(1000);

      expect(lastApiRequests.confirmBlueskyHandle).toBeUndefined();
      await expectNoDomainHandleBanner(page);
    });
  });
});
