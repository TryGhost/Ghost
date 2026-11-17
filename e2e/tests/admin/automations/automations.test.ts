import {
  AutomationEditorPage,
  AutomationsPage,
  MemberDetailsPage,
  MembersListPage,
} from '@/admin-pages';
import { HomePage, PublicPage } from '@/public-pages';
import { MailPit } from '@/helpers/services/email/mail-pit';
import {
  completePaidSignupViaPortal,
  createPaidPortalTier,
  expect,
  switchPlanViaPortal,
  test,
  withIsolatedPage,
} from '@/helpers/playwright';
import { extractMagicLink } from '@/helpers/services/email/utils';
import { signupViaPortal } from '@/helpers/playwright/flows/signup';

async function expectAutomationEmail(emailAddress: string, subject: string, body: string) {
  const inbox = new MailPit('http://localhost:8025');
  const messages = await inbox.search({ to: emailAddress, subject }, { timeoutMs: 30000 });
  expect(messages).toHaveLength(1);
  const email = await inbox.getMessageDetailed(messages[0]);
  expect(email.To.map((recipient) => recipient.Address)).toContain(emailAddress);
  expect(email.Subject).toBe(subject);
  expect(email.HTML).toContain(body);
}

test.describe('Ghost Admin - Automations', () => {
  test.describe.configure({ timeout: 90000 });
  test.use({ labs: { automations: true }, mailgunEnabled: true });

  test('free member signup sends the published automation email', async ({
    page,
    browser,
    baseURL,
    emailClient,
  }) => {
    const subject = 'Your automation welcome';
    const body = 'Thanks for joining. Your first automation email has arrived.';

    const automations = new AutomationsPage(page);
    await automations.goto();
    await page.getByRole('button', { name: 'New automation', exact: true }).click();

    // Without Stripe, the editor defaults to the free member signup trigger.
    const editor = new AutomationEditorPage(page);
    await editor.nameInput.fill('Free signup welcome');
    await expect(page.getByText('Free member signed up', { exact: true })).toBeVisible();
    await editor.addEmail(subject, body);
    await editor.publish();
    await expect(editor.publishedButton).toBeVisible();

    await withIsolatedPage(browser, { baseURL }, async ({ page: memberPage }) => {
      const { emailAddress } = await signupViaPortal(memberPage);
      const signupMessages = await emailClient.searchByRecipient(emailAddress);
      const signupEmail = await emailClient.getMessageDetailed(signupMessages[0]);
      await new PublicPage(memberPage).goto(extractMagicLink(signupEmail.Text));
      await expect(new HomePage(memberPage).accountButton).toBeVisible();

      await expectAutomationEmail(emailAddress, subject, body);
    });
  });

  test.describe('paid subscriptions', () => {
    test.use({ stripeEnabled: true });

    test('paid subscription started sends the published automation email', async ({
      page,
      browser,
      baseURL,
      stripe,
    }) => {
      const subject = 'Your paid subscription welcome';
      const body = 'Thanks for supporting us. Your paid subscription has started.';
      const tier = await createPaidPortalTier(
        page.request,
        { name: 'Supporter', currency: 'usd', monthly_price: 500, yearly_price: 5000 },
        { stripe },
      );

      const automations = new AutomationsPage(page);
      await automations.goto();
      await page.getByRole('button', { name: 'New automation', exact: true }).click();
      await page.getByRole('button', { name: /^Paid subscription started/ }).click();

      const editor = new AutomationEditorPage(page);
      await editor.nameInput.fill('Paid subscription welcome');
      await expect(page.getByText('Paid subscription started', { exact: true })).toBeVisible();
      await editor.addEmail(subject, body);
      await editor.publish();
      await expect(editor.publishedButton).toBeVisible();

      await withIsolatedPage(browser, { baseURL }, async ({ page: memberPage }) => {
        const { emailAddress } = await completePaidSignupViaPortal(memberPage, stripe!, {
          tierName: tier.name,
        });
        await expect(new HomePage(memberPage).accountButton).toBeVisible();

        await expectAutomationEmail(emailAddress, subject, body);
      });
    });

    test.describe('subscription changes', () => {
      test.use({ labs: { automations: true, automationsLifecycleTriggers: true } });

      test('Bronze to Gold sends the published subscription changed email', async ({
        page,
        browser,
        baseURL,
        stripe,
      }) => {
        const subject = 'Welcome to Gold';
        const body = 'Your subscription has changed from Bronze to Gold.';
        const bronze = await createPaidPortalTier(
          page.request,
          { name: 'Bronze', currency: 'usd', monthly_price: 500, yearly_price: 5000 },
          { stripe },
        );
        const gold = await createPaidPortalTier(
          page.request,
          { name: 'Gold', currency: 'usd', monthly_price: 1000, yearly_price: 10000 },
          { stripe },
        );

        await new AutomationsPage(page).goto();
        await page.getByRole('button', { name: 'New automation', exact: true }).click();
        await page.getByRole('button', { name: /^Paid subscription changed/ }).click();
        await page.getByRole('combobox', { name: 'From', exact: true }).click();
        await page.getByRole('option', { name: bronze.name, exact: true }).click();
        await page.keyboard.press('Escape');
        await page.getByRole('combobox', { name: 'To', exact: true }).click();
        await page.getByRole('option', { name: gold.name, exact: true }).click();
        await page.keyboard.press('Escape');

        const editor = new AutomationEditorPage(page);
        await editor.nameInput.fill('Bronze to Gold');
        await editor.addEmail(subject, body);
        await editor.publish();
        await expect(editor.publishedButton).toBeVisible();

        await withIsolatedPage(browser, { baseURL }, async ({ page: memberPage }) => {
          const { emailAddress } = await completePaidSignupViaPortal(memberPage, stripe!, {
            cadence: 'monthly',
            tierName: bronze.name,
          });
          await expect(new HomePage(memberPage).accountButton).toBeVisible();
          await switchPlanViaPortal(memberPage, { cadence: 'monthly', tierName: gold.name });

          await expectAutomationEmail(emailAddress, subject, body);
        });
      });
    });
  });

  test.describe('label added', () => {
    test.use({ labs: { automations: true, automationsLeadMagnets: true } });

    test('label added to a member sends the published automation email', async ({
      page,
      browser,
      baseURL,
      emailClient,
    }) => {
      const subject = 'Your label automation';
      const body = 'Your label has been added.';
      const label = 'Automation label';

      await new AutomationsPage(page).goto();
      await page.getByRole('button', { name: 'New automation', exact: true }).click();
      await page.getByRole('button', { name: /^Label added to a member/ }).click();
      await page
        .getByRole('combobox', { name: 'Triggered when this label is added to a member:' })
        .click();
      await page.getByRole('combobox', { name: 'Search labels' }).fill(label);
      await page.getByRole('option', { name: `Create “${label}”` }).click();

      const editor = new AutomationEditorPage(page);
      await editor.nameInput.fill('Label welcome');
      await editor.addEmail(subject, body);
      await editor.publish();
      await expect(editor.publishedButton).toBeVisible();

      await withIsolatedPage(browser, { baseURL }, async ({ page: memberPage }) => {
        const { emailAddress } = await signupViaPortal(memberPage);
        const signupMessages = await emailClient.searchByRecipient(emailAddress);
        const signupEmail = await emailClient.getMessageDetailed(signupMessages[0]);
        await new PublicPage(memberPage).goto(extractMagicLink(signupEmail.Text));
        await expect(new HomePage(memberPage).accountButton).toBeVisible();

        const members = new MembersListPage(page);
        await members.goto();
        await members.clickMemberByEmail(emailAddress);
        const memberDetails = new MemberDetailsPage(page);
        await memberDetails.labelsInput.click();
        await page.getByRole('combobox', { name: 'Labels' }).fill(label);
        await page.getByRole('option', { name: `${label} Edit label ${label}` }).click();
        await memberDetails.save();

        await expectAutomationEmail(emailAddress, subject, body);
      });
    });
  });
});
