import { FakeStripeCheckoutPage, HomePage } from '@/helpers/pages';
import { Page } from '@playwright/test';
import { SignUpPage, SignUpSuccessPage } from '@/portal-pages';
import { faker } from '@faker-js/faker';
import type { StripeTestService } from '@/helpers/services/stripe';

export async function signupViaPortal(page: Page): Promise<{ emailAddress: string; name: string }> {
  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.openPortal();

  const signUpPage = new SignUpPage(page);
  const emailAddress = `test${faker.string.uuid()}@ghost.org`;
  const name = faker.person.fullName();
  await signUpPage.fillAndSubmit(emailAddress, name);

  const successPage = new SignUpSuccessPage(page);
  await successPage.waitForSignUpSuccess();
  await successPage.closePortal();

  return { emailAddress, name };
}

interface PaidSignupOptions {
  cadence?: 'monthly' | 'yearly';
  emailAddress?: string;
  name?: string;
  tierName?: string;
}

/** Signs up for a paid tier in Portal and stops on the Stripe checkout page. */
export async function startPaidSignupViaPortal(
  page: Page,
  opts?: PaidSignupOptions,
): Promise<{ emailAddress: string; name: string }> {
  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.openPortal();

  const signUpPage = new SignUpPage(page);
  const emailAddress = opts?.emailAddress ?? `test${faker.string.uuid()}@ghost.org`;
  const name = opts?.name ?? faker.person.fullName();

  await signUpPage.waitForPortalToOpen();

  if (opts?.cadence) {
    await signUpPage.switchCadence(opts.cadence);
  }

  await signUpPage.fillAndSubmitPaidSignup(emailAddress, name, opts?.tierName);

  const fakeCheckoutPage = new FakeStripeCheckoutPage(page);
  await fakeCheckoutPage.waitUntilLoaded();

  return { emailAddress, name };
}

export async function completePaidSignupViaPortal(
  page: Page,
  stripe: StripeTestService,
  opts?: PaidSignupOptions,
): Promise<{ emailAddress: string; name: string }> {
  const { emailAddress, name } = await startPaidSignupViaPortal(page, opts);
  await stripe.completeLatestSubscriptionCheckout({ name });

  const latestCheckoutSession = stripe.getCheckoutSessions().at(-1);
  const successUrl = latestCheckoutSession?.response.success_url;
  if (!successUrl) {
    throw new Error('Latest Stripe checkout session does not include a success URL');
  }

  await page.goto(successUrl);

  return { emailAddress, name };
}
