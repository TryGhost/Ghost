import { describe, expect, it } from 'vitest';
import { article, billingWith, PAYMENT_FAILED } from './help-fixtures';
import { getAccountAlert, getSuggestedArticles } from './help-suggestions';

describe('getSuggestedArticles', () => {
  const faq = (slug: string, title: string, extra = {}) =>
    article(slug, title, '', ['FAQ'], [], extra);
  const signIn = faq('members-sign-in', 'How do members sign in to my site?');
  const disable = faq('can-i-disable-memberships', 'Can I disable memberships?');
  const javascript = faq('disabling-javascript', 'Is it possible to get around the login system?');
  const fees = faq('are-there-really-no-transaction-fees', 'Are there any transaction fees?', {
    featured: true,
  });
  const cookies = faq('cookie-notice', 'Do I need to add a cookie notice to my site?', {
    featured: true,
    updatedAt: '2026-06-01',
  });
  const robots = faq('modifying-robots-txt', 'Modifying robots.txt');
  const guide = article('commenting', 'Comments', '', ['Memberships'], [], { featured: true });
  const taggedOne = article(
    'tagged',
    'How do I moderate comments?',
    '',
    ['Memberships'],
    ['comments'],
  );
  const subscription = article('manage-your-subscription', 'Manage your subscription', '', [
    'Ghost(Pro)',
  ]);
  const all = [signIn, disable, javascript, fees, cookies, robots, guide, taggedOne, subscription];
  const titles = (suggestions: ReturnType<typeof getSuggestedArticles>) =>
    suggestions.map(({ article: { title }, source }) => `${title} (${source})`);

  it('shows the page’s FAQ questions while nothing is tagged', () => {
    const untagged = all.filter((a) => a !== taggedOne);
    expect(titles(getSuggestedArticles(untagged, 'comments', null))).toEqual([
      'How do members sign in to my site? (default)',
      'Can I disable memberships? (default)',
      'Is it possible to get around the login system? (default)',
    ]);
  });

  it('lets a tagged question lead, then fills with featured FAQ questions', () => {
    expect(titles(getSuggestedArticles(all, 'comments', null))).toEqual([
      'How do I moderate comments? (tagged)',
      'Do I need to add a cookie notice to my site? (featured)',
      'Are there any transaction fees? (featured)',
    ]);
  });

  it('leads with an urgent account alert', () => {
    const alert = {
      key: 'trial-ending' as const,
      reason: 'Soon',
      fallbackSlug: 'manage-your-subscription',
    };
    expect(titles(getSuggestedArticles(all, 'comments', alert))[0]).toBe(
      'Manage your subscription (alert)',
    );
  });

  it('leads with questions tagged #admin-general without a page', () => {
    const general = article(
      'turn-off-auto-renew',
      'How do I turn off auto-renew?',
      '',
      ['Ghost(Pro)'],
      ['general'],
    );
    expect(titles(getSuggestedArticles([...all, general], null, null))).toEqual([
      'How do I turn off auto-renew? (general)',
      'Do I need to add a cookie notice to my site? (featured)',
      'Are there any transaction fees? (featured)',
    ]);
  });

  it('only ever suggests questions, never guides or topic-like FAQ titles', () => {
    const suggested = getSuggestedArticles(all, null, null).map(({ article: { slug } }) => slug);
    expect(suggested).not.toContain('commenting');
    expect(suggested).not.toContain('modifying-robots-txt');
    expect(titles(getSuggestedArticles([fees, robots, guide], null, null))).toEqual([
      'Are there any transaction fees? (featured)',
    ]);
  });
});

describe('getAccountAlert', () => {
  it('leads with a failed payment, then a trial about to end', () => {
    expect(
      getAccountAlert(billingWith({ paymentFailed: PAYMENT_FAILED, trialDaysLeft: 2 })),
    ).toEqual({
      key: 'payment-failed',
      reason: 'A payment failed. Your site will be suspended in 5 days',
      fallbackSlug: 'troubleshooting-payment-issues',
    });
    expect(getAccountAlert(billingWith({ trialDaysLeft: 2 }))?.key).toBe('trial-ending');
    expect(getAccountAlert(billingWith({ trialDaysLeft: 1 }))?.reason).toBe(
      'Your trial ends tomorrow',
    );
    expect(getAccountAlert(billingWith({ trialDaysLeft: 9 }))).toBeNull();
    expect(getAccountAlert(billingWith({ status: 'active' }))).toBeNull();
  });

  it('only alerts those who can manage billing', () => {
    expect(
      getAccountAlert(billingWith({ canManage: false, paymentFailed: PAYMENT_FAILED })),
    ).toBeNull();
  });
});
