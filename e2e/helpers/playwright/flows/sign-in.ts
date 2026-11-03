import { Page } from '@playwright/test';

import { EmailClient, MailPit } from '@/helpers/services/email/mail-pit';
import { HomePage, PublicPage } from '@/public-pages';
import { LoginPage, SidebarPage } from '@/admin-pages';
import { Member, StaffAccount } from '@/data-factory';
import { SignInPage } from '@/portal-pages';
import { extractMagicLink } from '@/helpers/services/email/utils';

/**
 * Signs in as a member using the portal magic link flow.
 * Requests a sign-in link via portal and uses the magic link from email.
 *
 * @param page - The Playwright page
 * @param member - The member to sign in as (must have been created already)
 */
export async function signInAsMember(page: Page, member: Member): Promise<void> {
  const emailClient: EmailClient = new MailPit();

  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.openPortalViaSignInLink();

  const signInPage = new SignInPage(page);
  await signInPage.emailInput.fill(member.email);
  await signInPage.continueButton.click();

  // Wait for magic link email
  const messages = await emailClient.searchByRecipient(member.email, { timeoutMs: 10000 });
  if (messages.length === 0) {
    throw new Error(`No sign-in email found for ${member.email}`);
  }
  const latestMessage = await emailClient.getMessageDetailed(messages[0]);
  const magicLink = extractMagicLink(latestMessage.Text, 'signin');

  const publicPage = new PublicPage(page);
  await publicPage.goto(magicLink);
  await homePage.waitUntilLoaded();
}

/**
 * Signs in to Ghost Admin as a staff user and waits until Admin has loaded, so the next navigation
 * isn't redirected back to the sign-in screen.
 *
 * @param page - The Playwright page, usually from `withIsolatedPage` for a second session
 * @param account - The staff account to sign in as
 */
export async function signInAsStaff(page: Page, account: StaffAccount): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.signIn(account.email, account.password);
  await new SidebarPage(page).sidebar.waitFor({ state: 'visible' });
}
