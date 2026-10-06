import { MemberDetailsPage } from '@/admin-pages';
import { MemberFactory, createMemberFactory } from '@/data-factory';
import {
  SILVER_EXPIRY,
  TWO_COMP_TIERS,
  captureWrite,
  compSubscription,
  giftSubscription,
  memberPath,
  paidSubscription,
  seedSubscriptions,
  sentTiers,
} from '@/helpers/members/member-detail';
import { expect, test } from '@/helpers/playwright';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

/**
 * Behaviour contract for `/members/:id`.
 *
 * The assertions describe what the screen does rather than how it is built.
 * Keep them that way: a test that reaches for implementation-specific markup
 * stops being a contract and starts being a snapshot.
 */

usePerTestIsolation();

test.describe('Ghost Admin - Member Detail', () => {
  let memberFactory: MemberFactory;
  let memberDetailsPage: MemberDetailsPage;

  test.beforeEach(async ({ page }) => {
    memberFactory = createMemberFactory(page.request);
    memberDetailsPage = new MemberDetailsPage(page);
  });

  test.describe('Subscriptions', () => {
    // The Subscriptions section is gated on paid members being enabled.
    test.use({ stripeEnabled: true });

    test('paid subscription - shows the tier, price, interval and renewal date', async ({
      page,
    }) => {
      const member = await memberFactory.create({
        name: 'Paid Member',
        email: 'paid-sub@ghost.org',
      });
      await seedSubscriptions(page, member.id, 'paid', [paidSubscription()]);

      await page.goto(memberPath(member.id));

      await expect(page.getByText('Bronze').first()).toBeVisible();
      await expect(page.getByText('10.50').first()).toBeVisible();
      await expect(page.getByText(/month/i).first()).toBeVisible();
      await expect(page.getByText(/Renews 15 Feb 2026/).first()).toBeVisible();
    });

    test('subscription attribution with an unsafe url - shows the page as text, not a link', async ({
      page,
    }) => {
      // Subscription attribution URLs come from public signup/checkout URL
      // history, which the server does not scheme-validate, so a member can get
      // a `javascript:` URL stored as their own subscription attribution. It
      // should still be shown, but never as a clickable link a staff user could
      // trigger — the same rule the sidebar and activity feed already apply.
      const member = await memberFactory.create({
        name: 'Unsafe Attribution',
        email: 'unsafe-attribution@ghost.org',
      });
      await seedSubscriptions(page, member.id, 'paid', [
        paidSubscription({
          attribution: {
            title: 'Signup page',
            url: "javascript:localStorage.setItem('attribution_xss', 'executed')",
            referrer_source: 'Twitter',
          },
        }),
      ]);

      await page.goto(memberPath(member.id));
      await page.getByTestId('member-subscription-details-toggle').first().click();

      await expect(page.getByText('Signup page')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Signup page' })).toHaveCount(0);
    });

    test('subscription attribution with a safe url - shows the page as a working link', async ({
      page,
    }) => {
      // The guard must not swallow legitimate attribution: a site-relative or
      // http(s) URL still renders as a link the staff user can follow.
      const member = await memberFactory.create({
        name: 'Safe Attribution',
        email: 'safe-attribution@ghost.org',
      });
      await seedSubscriptions(page, member.id, 'paid', [
        paidSubscription({
          attribution: { title: 'Welcome post', url: '/welcome/', referrer_source: 'Twitter' },
        }),
      ]);

      await page.goto(memberPath(member.id));
      await page.getByTestId('member-subscription-details-toggle').first().click();

      const link = page.getByRole('link', { name: 'Welcome post' });
      await expect(link).toBeVisible();

      // Following it opens the page in a new tab — proof the affordance is real.
      const popupPromise = page.context().waitForEvent('page');
      await link.click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL(/\/welcome/);
    });

    test('subscription set to cancel - shows remaining access rather than a renewal', async ({
      page,
    }) => {
      const member = await memberFactory.create({
        name: 'Cancelling Member',
        email: 'cancelling-sub@ghost.org',
      });
      await seedSubscriptions(page, member.id, 'paid', [
        paidSubscription({ cancel_at_period_end: true }),
      ]);

      await page.goto(memberPath(member.id));

      await expect(page.getByText(/Has access until\s+15 Feb 2026/).first()).toBeVisible();
      await expect(page.getByText(/Renews/)).toHaveCount(0);
    });

    test('complimentary subscription - shows the tier without a price', async ({ page }) => {
      const member = await memberFactory.create({
        name: 'Comp Member',
        email: 'comp-sub@ghost.org',
      });
      await seedSubscriptions(page, member.id, 'comped', [compSubscription()]);

      await page.goto(memberPath(member.id));

      await expect(page.getByText('Bronze').first()).toBeVisible();
      await expect(page.getByText(/Complimentary/i).first()).toBeVisible();
    });

    test('gift subscription - offers no actions menu', async ({ page }) => {
      // A gift is bought by someone else and can't be cancelled or
      // revoked from here, so the row deliberately has no menu.
      const member = await memberFactory.create({
        name: 'Gift Member',
        email: 'gift-sub@ghost.org',
      });
      await seedSubscriptions(page, member.id, 'gift', [giftSubscription()]);

      await page.goto(memberPath(member.id));

      await expect(page.getByText('Bronze').first()).toBeVisible();
      await expect(memberDetailsPage.subscriptionActionsButton).toHaveCount(0);
    });

    test('cancelling a subscription - asks the server to cancel at period end', async ({
      page,
    }) => {
      const member = await memberFactory.create({
        name: 'Cancel Member',
        email: 'cancel-action@ghost.org',
      });
      const subs = [paidSubscription()];
      await seedSubscriptions(page, member.id, 'paid', subs);
      // Reflect the write back into the seeded read so the screen can
      // re-render from it, the way a real refetch would.
      const sent = await captureWrite(
        page,
        `**/members/${member.id}/subscriptions/sub_paid_123/**`,
        (body) => {
          subs[0].cancel_at_period_end = body.cancel_at_period_end as boolean;
        },
      );

      await page.goto(memberPath(member.id));
      await memberDetailsPage.subscriptionActionsButton.click();
      await memberDetailsPage.cancelSubscriptionButton.click();

      // The request is the contract — the server doesn't care which UI sent it.
      await expect.poll(() => sent.body?.cancel_at_period_end).toBe(true);
    });

    test('continuing a cancelled subscription - asks the server to resume it', async ({ page }) => {
      const member = await memberFactory.create({
        name: 'Continue Member',
        email: 'continue-action@ghost.org',
      });
      const subs = [paidSubscription({ cancel_at_period_end: true })];
      await seedSubscriptions(page, member.id, 'paid', subs);
      const sent = await captureWrite(
        page,
        `**/members/${member.id}/subscriptions/sub_paid_123/**`,
        (body) => {
          subs[0].cancel_at_period_end = body.cancel_at_period_end as boolean;
        },
      );

      await page.goto(memberPath(member.id));
      await memberDetailsPage.subscriptionActionsButton.click();
      await memberDetailsPage.continueSubscriptionButton.click();

      await expect.poll(() => sent.body?.cancel_at_period_end).toBe(false);
    });

    test('removing a complimentary subscription - puts back only the surviving tiers', async ({
      page,
    }) => {
      const member = await memberFactory.create({
        name: 'Multi Comp',
        email: 'multi-comp@ghost.org',
      });
      await seedSubscriptions(page, member.id, 'comped', [compSubscription()], {
        tiers: TWO_COMP_TIERS(),
      });
      const sent = await captureWrite(
        page,
        new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`),
      );

      await page.goto(memberPath(member.id));
      await memberDetailsPage.removeComplimentarySubscription();

      await expect.poll(() => sentTiers(sent)?.length).toBe(1);
      expect(sentTiers(sent)?.[0].id).toBe('tier_silver');
    });
  });
});

/**
 * Behaviours with no counterpart in the generic suite above: they assert an
 * affordance specific to this screen, or need a Stripe-enabled environment.
 */
test.describe('Ghost Admin - Member Detail - screen-specific behaviour', () => {
  test.use({ stripeEnabled: true });

  let memberFactory: MemberFactory;
  let memberDetailsPage: MemberDetailsPage;

  test.beforeEach(async ({ page }) => {
    memberFactory = createMemberFactory(page.request);
    memberDetailsPage = new MemberDetailsPage(page);
  });

  test('adding a complimentary subscription - grants the chosen tier forever', async ({ page }) => {
    const member = await memberFactory.create({
      name: 'Comp Grant',
      email: 'comp-grant-react@ghost.org',
    });
    const sent = await captureWrite(
      page,
      new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`),
    );

    await page.goto(memberPath(member.id));
    await page.getByRole('button', { name: /Add complimentary subscription/ }).click();
    await page.getByTestId('comp-tier-select').click();
    const option = memberDetailsPage.compTierOptions.first();
    const chosenTierId = await option.getAttribute('data-tier-id');
    await option.click();
    await page.getByTestId('comp-add-confirm').click();

    await expect.poll(() => sentTiers(sent)?.length).toBe(1);
    expect(sentTiers(sent)?.[0].id).toBe(chosenTierId);
    expect(sentTiers(sent)?.[0].expiry_at ?? null).toBeNull();
  });

  test('invalid email - save is disabled', async ({ page }) => {
    // The submit is blocked rather than allowed to fail, so there is no
    // server error to surface.
    const member = await memberFactory.create({
      name: 'Invalid Email',
      email: 'valid-react@ghost.org',
    });

    await page.goto(memberPath(member.id));
    await memberDetailsPage.emailInput.fill('not-an-email');

    await expect(memberDetailsPage.saveButton).toBeDisabled();
  });

  test('failed member load - offers a retry rather than a not-found message', async ({ page }) => {
    // A failed load renders a recoverable panel rather than dead-ending
    // the route.
    const member = await memberFactory.create({
      name: 'Retry Target',
      email: 'retry-target@ghost.org',
    });
    let requests = 0;
    const memberReadRegex = new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`);
    await page.route(memberReadRegex, async (route) => {
      if (route.request().method() !== 'GET') {
        return route.continue();
      }
      requests += 1;
      if (requests === 1) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'boom' }] }),
        });
      }
      return route.continue();
    });

    await page.goto(memberPath(member.id));

    const errorPanel = page.getByTestId('member-detail-load-error');
    await expect(errorPanel).toBeVisible();
    // A server error must not be reported as a missing member, anywhere
    // on the screen. Asserting only the body copy previously let the
    // breadcrumb go on claiming "Member not found" beside a
    // "couldn't load" message.
    await expect(page.getByText(/not found/i)).toHaveCount(0);
    await expect(page.getByText(/couldn[’']t be found/)).toHaveCount(0);

    await errorPanel.getByRole('button', { name: 'Retry' }).click();

    await expect(memberDetailsPage.screenTitle).toHaveText('Retry Target');
    await expect(errorPanel).toHaveCount(0);
  });

  test.describe('Removing a complimentary subscription', () => {
    test.use({ stripeEnabled: true });

    test('preserves the expiry date on surviving tiers', async ({ page }) => {
      // The server treats a tier arriving without `expiry_at` as null and
      // wipes the pivot (`models/member.js` updateTierExpiry), so the
      // whole set has to be sent back with expiries intact.
      const member = await memberFactory.create({
        name: 'Multi Comp',
        email: 'multi-comp-react@ghost.org',
      });
      await seedSubscriptions(page, member.id, 'comped', [compSubscription()], {
        tiers: TWO_COMP_TIERS(),
      });
      const sent = await captureWrite(
        page,
        new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`),
      );

      await page.goto(memberPath(member.id));
      await memberDetailsPage.removeComplimentarySubscription();

      await expect.poll(() => sentTiers(sent)?.length).toBe(1);
      expect(sentTiers(sent)?.[0].expiry_at).toBe(SILVER_EXPIRY);
    });

    test('asks for confirmation first', async ({ page }) => {
      const member = await memberFactory.create({
        name: 'Confirm Comp',
        email: 'confirm-comp@ghost.org',
      });
      await seedSubscriptions(page, member.id, 'comped', [compSubscription()], {
        tiers: TWO_COMP_TIERS(),
      });
      const sent = await captureWrite(
        page,
        new RegExp(`/ghost/api/admin/members/${member.id}/\\??[^/]*$`),
      );

      await page.goto(memberPath(member.id));
      await memberDetailsPage.subscriptionActionsButton.first().click();
      await memberDetailsPage.removeComplimentaryButton.click();

      await expect(
        page.getByRole('alertdialog', { name: /Remove complimentary subscription/ }),
      ).toBeVisible();
      expect(sent.body).toBeUndefined();
    });
  });

  test('new member - seeded newsletter defaults do not count as unsaved changes', async ({
    page,
  }) => {
    // The create form seeds its newsletter defaults and treats that seeded
    // state as pristine, so an untouched form must not trap on leave.
    await page.goto(memberPath('new'));
    await expect(memberDetailsPage.newsletterSubscriptionToggles.first()).toBeVisible();

    await memberDetailsPage.membersBackLink.click();

    await expect(page).toHaveURL(/#\/members(\?|$)/);
    await expect(memberDetailsPage.confirmLeaveButton).toHaveCount(0);
  });
});
