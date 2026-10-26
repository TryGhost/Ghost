import { describe, expect, it } from 'vitest';
import { article, billingWith, PAYMENT_FAILED } from './help-fixtures';
import { getAccountAlert, getSuggestedArticles } from './help-suggestions';

describe('getSuggestedArticles', () => {
  const comments = article('commenting', 'Comments', '', ['Memberships']);
  const portal = article('customize-portal', 'Customize Portal', '', ['Memberships'], [], {
    featured: true,
  });
  const members = article('member-management', 'Member management', '', ['Memberships'], [], {
    updatedAt: '2026-06-01',
  });
  const taggedOne = article('tagged', 'Tagged for comments', '', ['FAQ'], ['comments']);
  const subscription = article('manage-your-subscription', 'Manage your subscription', '', [
    'Ghost(Pro)',
  ]);
  const featured = article('setup', 'Setting up your site', '', ['Getting started'], [], {
    featured: true,
  });
  const all = [comments, portal, members, taggedOne, subscription, featured];
  const titles = (suggestions: ReturnType<typeof getSuggestedArticles>) =>
    suggestions.map(({ article: { title }, source }) => `${title} (${source})`);

  it('shows the page’s defaults while nothing is tagged, then its topic, featured first', () => {
    const untagged = all.filter((a) => a !== taggedOne);
    expect(titles(getSuggestedArticles(untagged, 'comments', null))).toEqual([
      'Comments (default)',
      'Customize Portal (topic)',
      'Member management (topic)',
    ]);
  });

  it('lets tagged articles replace the defaults', () => {
    expect(titles(getSuggestedArticles(all, 'comments', null))[0]).toBe(
      'Tagged for comments (tagged)',
    );
    expect(titles(getSuggestedArticles(all, 'comments', null))).not.toContain('Comments (default)');
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

  it('leads with articles tagged #admin-general without a page', () => {
    const general = article(
      'turn-off-auto-renew',
      'Turn off auto-renew',
      '',
      ['Ghost(Pro)'],
      ['general'],
    );
    expect(titles(getSuggestedArticles([...all, general], null, null))).toEqual([
      'Turn off auto-renew (general)',
      'Customize Portal (featured)',
      'Setting up your site (featured)',
    ]);
  });

  it('falls back on featured articles without a page', () => {
    expect(titles(getSuggestedArticles(all, null, null))).toEqual([
      'Customize Portal (featured)',
      'Setting up your site (featured)',
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
