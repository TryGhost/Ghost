import * as assert from 'assert/strict';
import {searchKeywords as emailSearchKeywords} from '@/settings/email/search-keywords';
import {searchKeywords as emailsSearchKeywords} from '@/settings/email/emails-search-keywords';
import {searchKeywords as generalSearchKeywords} from '@/settings/general/search-keywords';
import {searchKeywords as membershipSearchKeywords} from '@/settings/membership/search-keywords';

const includes = (keywords: string[], term: string) => keywords.some(keyword => keyword.toLowerCase().includes(term.toLowerCase()));

describe('settings search keywords', function () {
    it('analytics keywords include "general" and do not duplicate "membership"', function () {
        const analytics = generalSearchKeywords.analytics;
        assert.equal(analytics.includes('general'), true);
        assert.equal(analytics.filter(keyword => keyword === 'membership').length, 1);
    });

    it('tips keywords map to the membership section, not growth', function () {
        assert.equal(membershipSearchKeywords.tips.includes('membership'), true);
        assert.equal(membershipSearchKeywords.tips.includes('growth'), false);
    });

    it('email keyword sets do not expose tips/donations payment terms', function () {
        for (const keywords of [...Object.values(emailSearchKeywords), ...Object.values(emailsSearchKeywords)]) {
            assert.equal(includes(keywords, 'tips'), false);
            assert.equal(includes(keywords, 'donations'), false);
            assert.equal(includes(keywords, 'one time'), false);
            assert.equal(includes(keywords, 'payment'), false);
        }
    });

    it('email keyword sets no longer expose stale nav-menu aggregates', function () {
        assert.equal('newslettersNavMenu' in emailSearchKeywords, false);
        assert.equal('emailsNavMenu' in emailsSearchKeywords, false);
    });
});
