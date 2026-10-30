import { searchKeywords as emailSearchKeywords } from '@/settings/email/search-keywords';
import { searchKeywords as emailsSearchKeywords } from '@/settings/email/emails-search-keywords';
import { searchKeywords as generalSearchKeywords } from '@/settings/general/search-keywords';
import { searchKeywords as membershipSearchKeywords } from '@/settings/membership/search-keywords';

const includes = (keywords: string[], term: string) =>
  keywords.some((keyword) => keyword.toLowerCase().includes(term.toLowerCase()));

describe('settings search keywords', function () {
  it('analytics keywords include "general" and do not duplicate "membership"', function () {
    const analytics = generalSearchKeywords.analytics;
    expect(analytics.includes('general')).toBe(true);
    expect(analytics.filter((keyword) => keyword === 'membership').length).toBe(1);
  });

  it('tips keywords map to the membership section, not growth', function () {
    expect(membershipSearchKeywords.tips.includes('membership')).toBe(true);
    expect(membershipSearchKeywords.tips.includes('growth')).toBe(false);
  });

  it('email keyword sets do not expose tips/donations payment terms', function () {
    for (const keywords of [
      ...Object.values(emailSearchKeywords),
      ...Object.values(emailsSearchKeywords),
    ]) {
      expect(includes(keywords, 'tips')).toBe(false);
      expect(includes(keywords, 'donations')).toBe(false);
      expect(includes(keywords, 'one time')).toBe(false);
      expect(includes(keywords, 'payment')).toBe(false);
    }
  });

  it('email keyword sets no longer expose stale nav-menu aggregates', function () {
    expect('newslettersNavMenu' in emailSearchKeywords).toBe(false);
    expect('emailsNavMenu' in emailsSearchKeywords).toBe(false);
  });
});
