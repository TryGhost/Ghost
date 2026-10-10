import { MemberDetailsPage, SidebarPage } from '@/admin-pages';
import { MemberFactory, createMemberFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { memberPath } from '@/helpers/members/member-detail';
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

  test('member name renders in the screen title', async ({ page }) => {
    const member = await memberFactory.create({
      name: 'Ada Lovelace',
      email: 'ada-detail@ghost.org',
    });

    await page.goto(memberPath(member.id));

    await expect(memberDetailsPage.screenTitle).toContainText('Ada Lovelace');
  });

  test('editing the member name - persists to the server', async ({ page }) => {
    const member = await memberFactory.create({ name: 'Grace', email: 'grace-detail@ghost.org' });

    await page.goto(memberPath(member.id));
    await memberDetailsPage.nameInput.fill('Grace Hopper');
    await memberDetailsPage.saveButton.click();

    await expect
      .poll(
        async () => {
          const res = await page.request.get(`/ghost/api/admin/members/${member.id}/`);
          const body = await res.json();
          return body?.members?.[0]?.name;
        },
        { timeout: 10000 },
      )
      .toBe('Grace Hopper');
  });

  test('clicking the back link - returns to the members list', async ({ page }) => {
    const member = await memberFactory.create({
      name: 'Grace Hopper',
      email: 'grace-back-detail@ghost.org',
    });

    await page.goto(memberPath(member.id));
    await memberDetailsPage.membersBackLink.click();

    await expect(page).toHaveURL(/#\/members$/);
  });

  test('impersonation modal - exposes a real signin url', async ({ page }) => {
    const member = await memberFactory.create({
      name: 'Alan Turing',
      email: 'alan-detail@ghost.org',
    });

    await page.goto(memberPath(member.id));
    await memberDetailsPage.settingsSection.memberActionsButton.click();
    await memberDetailsPage.settingsSection.impersonateButton.click();

    // The url is fetched after the modal opens, so assert on the value to
    // let Playwright wait rather than reading the empty initial state.
    await expect(memberDetailsPage.magicLinkInput).toHaveValue(/^https?:\/\/.+/);
  });

  test('signing out of all devices - closes the confirmation and stays on the member', async ({
    page,
  }) => {
    const member = await memberFactory.create({
      name: 'Rear Admiral',
      email: 'rear-detail@ghost.org',
    });

    await page.goto(memberPath(member.id));
    await memberDetailsPage.settingsSection.memberActionsButton.click();
    await memberDetailsPage.settingsSection.signOutOfAllDevices.click();
    // Scoped to the modal so the click can't hit the account-owner
    // "Sign out" button in the admin sidebar dropdown.
    await memberDetailsPage.logoutConfirmModal
      .getByRole('button', { name: 'Sign out', exact: true })
      .click();

    await expect(memberDetailsPage.logoutConfirmModal).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`#/members/${member.id}`));
  });

  test('deleting a member - returns to the list and removes the record', async ({ page }) => {
    const member = await memberFactory.create({
      name: 'Deletable',
      email: 'delete-detail@ghost.org',
    });

    await page.goto(memberPath(member.id));
    await memberDetailsPage.settingsSection.memberActionsButton.click();
    await memberDetailsPage.settingsSection.deleteButton.click();
    await memberDetailsPage.settingsSection.confirmDeleteButton.click();

    await expect(page).toHaveURL(/#\/members$/);
    const res = await page.request.get(`/ghost/api/admin/members/${member.id}/`);
    expect(res.status()).toBe(404);
  });

  test('creating a member - persists to the server and redirects to the detail', async ({
    page,
  }) => {
    const email = 'new-member-detail@ghost.org';

    await page.goto(memberPath('new'));
    await memberDetailsPage.nameInput.fill('New Member');
    await memberDetailsPage.emailInput.fill(email);
    await memberDetailsPage.saveButton.click();

    let createdId: string | undefined;
    await expect
      .poll(
        async () => {
          const res = await page.request.get(
            `/ghost/api/admin/members/?filter=${encodeURIComponent(`email:'${email}'`)}`,
          );
          const body = await res.json();
          createdId = body?.members?.[0]?.id;
          return body?.members?.[0]?.name;
        },
        { timeout: 10000 },
      )
      .toBe('New Member');
    await expect(page).toHaveURL(new RegExp(`#/members/${createdId}(\\?|$)`));
  });

  test('disabling then re-enabling commenting - clears the disabled indicator', async ({
    page,
  }) => {
    const member = await memberFactory.create({
      name: 'Commenter',
      email: 'commenter-toggle@ghost.org',
    });

    await page.goto(memberPath(member.id));
    await memberDetailsPage.settingsSection.memberActionsButton.click();
    await memberDetailsPage.settingsSection.disableCommentingButton.click();
    await memberDetailsPage.disableCommentingConfirmButton.click();

    await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();

    await memberDetailsPage.settingsSection.memberActionsButton.click();
    await memberDetailsPage.settingsSection.enableCommentingButton.click();

    await expect(memberDetailsPage.commentingDisabledIndicator).toBeHidden();
  });

  test('sidebar - shows the signup location and created date', async ({ page }) => {
    // Members created through the API carry no geolocation, so the
    // location falls back deterministically.
    const member = await memberFactory.create({
      name: 'Katherine Johnson',
      email: 'katherine-sidebar@ghost.org',
    });

    await page.goto(memberPath(member.id));

    await expect(page.getByText('Unknown location')).toBeVisible();
    await expect(page.getByText(/Created/)).toBeVisible();
  });

  test('leaving with unsaved changes - warns before navigating away', async ({ page }) => {
    const member = await memberFactory.create({
      name: 'Grace Hopper',
      email: 'grace-unsaved@ghost.org',
    });

    await page.goto(memberPath(member.id));
    await memberDetailsPage.nameInput.fill('Grace B. Hopper');
    await memberDetailsPage.membersBackLink.click();

    await expect(memberDetailsPage.confirmLeaveButton).toBeVisible();
    await memberDetailsPage.confirmLeaveButton.click();
    await expect(page).toHaveURL(/#\/members$/);
  });

  test('leaving with unsaved changes via the sidebar - warns before navigating away', async ({
    page,
  }) => {
    // The sidebar navigates with native hash anchors rather than
    // client-side router links, so it exercises a different guard path
    // than the back link above; both must warn.
    const sidebar = new SidebarPage(page);
    const member = await memberFactory.create({
      name: 'Grace Hopper',
      email: 'grace-unsaved-sidebar@ghost.org',
    });

    await page.goto(memberPath(member.id));
    await memberDetailsPage.nameInput.fill('Grace B. Hopper');
    await sidebar.getNavLink('Members').click();

    await expect(memberDetailsPage.confirmLeaveButton).toBeVisible();
    await memberDetailsPage.confirmLeaveButton.click();
    await expect(page).toHaveURL(/#\/members$/);
  });

  test('toggling a newsletter - persists the new state', async ({ page }) => {
    const member = await memberFactory.create({
      name: 'Newsletter Test',
      email: 'newsletter-toggle@ghost.org',
    });

    await page.goto(memberPath(member.id));
    // Wait on the toggle, not the checkbox — the real input is hidden
    // behind a styled span, so the control is never visible itself.
    await expect(memberDetailsPage.newsletterSubscriptionToggles.first()).toBeVisible();
    const initiallyChecked = await memberDetailsPage.newsletterSubscriptionCheckboxes
      .first()
      .isChecked();

    await memberDetailsPage.newsletterSubscriptionToggles.first().click();
    await memberDetailsPage.save();
    await page.reload();

    await expect(memberDetailsPage.newsletterSubscriptionCheckboxes.first()).toBeChecked({
      checked: !initiallyChecked,
    });
  });

  test('activity feed - view-all link points at this members full activity', async ({ page }) => {
    const member = await memberFactory.create({
      name: 'Activity Target',
      email: 'activity-viewall@ghost.org',
    });
    // A fresh member's signup event is written asynchronously, so serve a
    // known event rather than racing it — the link only renders on the
    // populated branch.
    await page.route(/\/ghost\/api\/admin\/members\/events\/?\?/, async (route) => {
      if (route.request().method() !== 'GET') {
        return route.continue();
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              type: 'signup_event',
              data: {
                id: 'evt-1',
                created_at: new Date(0).toISOString(),
                member_id: member.id,
                member: { id: member.id, name: member.name, email: member.email },
              },
            },
          ],
          meta: { pagination: {} },
        }),
      });
    });

    await page.goto(memberPath(member.id));

    const viewAll = page.getByRole('link', { name: /View all member activity/ });
    await expect(viewAll).toBeVisible();
    await expect(viewAll).toHaveAttribute(
      'href',
      new RegExp(`#/members-activity/?\\?member=${member.id}`),
    );
  });
});
