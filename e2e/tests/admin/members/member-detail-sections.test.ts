import { MemberDetailsPage } from '@/admin-pages';
import { MemberFactory, createMemberFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { interceptMemberRead, memberPath } from '@/helpers/members/member-detail';
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

  test.describe('New member screen', () => {
    // The Subscriptions section is gated on paid members being enabled, so
    // stripe has to be on for it to render at all.
    test.use({ stripeEnabled: true });

    test('newsletters section - renders a toggle list', async ({ page }) => {
      await page.goto(memberPath('new'));

      await expect(page.getByRole('heading', { name: 'Newsletters', exact: true })).toBeVisible();
      await expect(memberDetailsPage.newsletterSubscriptionToggles.first()).toBeVisible();
    });

    test('newsletters section - toggles are checked by default', async ({ page }) => {
      // Newsletters with subscribe_on_signup and members visibility are
      // pre-selected on create, so the admin can see what the new member
      // will land subscribed to. Assert every toggle rather than the
      // first, which would pass even if a later default were missed.
      await page.goto(memberPath('new'));
      await expect(memberDetailsPage.newsletterSubscriptionToggles.first()).toBeVisible();

      const count = await memberDetailsPage.newsletterSubscriptionCheckboxes.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(memberDetailsPage.newsletterSubscriptionCheckboxes.nth(i)).toBeChecked();
      }
    });

    test('activity section - shows an empty state', async ({ page }) => {
      await page.goto(memberPath('new'));

      await expect(
        page.getByText('All events related to this member will be shown here.'),
      ).toBeVisible();
    });

    test('subscriptions section - shows an empty state', async ({ page }) => {
      await page.goto(memberPath('new'));

      await expect(page.getByRole('heading', { name: 'Subscriptions', exact: true })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'No subscriptions', exact: true }),
      ).toBeVisible();
    });
  });

  test.describe('Engagement section', () => {
    const stubMemberRead = interceptMemberRead;

    test('member has received no emails - shows an empty state', async ({ page }) => {
      const member = await memberFactory.create({
        name: 'Ada Lovelace',
        email: 'engagement-empty@ghost.org',
      });

      await page.goto(memberPath(member.id));

      await expect(page.getByRole('heading', { name: 'Engagement' })).toBeVisible();
      await expect(page.getByText(/We[’']ll show Ada[’']s email stats here/)).toBeVisible();
    });

    test('member has received emails - shows counts and open rate', async ({ page }) => {
      const member = await memberFactory.create({
        name: 'Stats Member',
        email: 'engagement-stats@ghost.org',
      });
      // Inject the stats so the branch renders deterministically rather
      // than depending on what the fixture database happens to hold.
      await stubMemberRead(page, member.id, (m) => {
        m.email_count = 12;
        m.email_opened_count = 9;
        m.email_open_rate = 75;
      });

      await page.goto(memberPath(member.id));

      const engagement = memberDetailsPage.engagementSection;
      await expect(engagement.getByText('Emails received')).toBeVisible();
      await expect(engagement.getByText('12', { exact: true })).toBeVisible();
      await expect(engagement.getByText('Emails opened')).toBeVisible();
      await expect(engagement.getByText('9', { exact: true })).toBeVisible();
      await expect(engagement.getByText('Average open rate')).toBeVisible();
      await expect(engagement.getByText(/75\s*%/)).toBeVisible();
    });

    test('email fields absent from the payload - shows the empty state', async ({ page }) => {
      const member = await memberFactory.create({
        name: 'Ada Lovelace',
        email: 'engagement-undef@ghost.org',
      });
      await stubMemberRead(page, member.id, (m) => {
        delete m.email_count;
        delete m.email_opened_count;
        delete m.email_open_rate;
      });

      await page.goto(memberPath(member.id));

      await expect(page.getByRole('heading', { name: 'Engagement' })).toBeVisible();
      await expect(page.getByText(/We[’']ll show Ada[’']s email stats here/)).toBeVisible();
    });

    test('open rate not yet calculated - shows the placeholder', async ({ page }) => {
      const member = await memberFactory.create({
        name: 'Early Stats',
        email: 'engagement-null@ghost.org',
      });
      // The server sends a null rate until the member has been sent 5
      // newsletters; both the count and a bare % would be misleading.
      await stubMemberRead(page, member.id, (m) => {
        m.email_count = 3;
        m.email_opened_count = 2;
        m.email_open_rate = null;
      });

      await page.goto(memberPath(member.id));

      await expect(
        page.getByText('This metric is calculated once a member has received 5 newsletters.'),
      ).toBeVisible();
    });
  });
});
