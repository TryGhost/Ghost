import {describe, it} from 'mocha';
import {expect} from 'chai';
import {hasEmailAudienceSplit, segmentParts} from 'ghost-admin/utils/email-audience-segments';

describe('Unit: Util: email-audience-segments', function () {
    describe('hasEmailAudienceSplit', function () {
        it('splits a paid post with a paywall card', function () {
            expect(hasEmailAudienceSplit({visibility: 'paid', hasPaywallCard: true})).to.be.true;
        });

        it('splits a tier-gated post with a paywall card', function () {
            expect(hasEmailAudienceSplit({visibility: 'tiers', hasPaywallCard: true})).to.be.true;
        });

        it('does not split without a paywall card - there is no preview to send', function () {
            expect(hasEmailAudienceSplit({visibility: 'paid', hasPaywallCard: false})).to.be.false;
        });

        it('does not split a members-only post - every member has access', function () {
            expect(hasEmailAudienceSplit({visibility: 'members', hasPaywallCard: true})).to.be.false;
        });

        it('does not split a public post', function () {
            expect(hasEmailAudienceSplit({visibility: 'public', hasPaywallCard: true})).to.be.false;
        });

        it('handles a missing post', function () {
            expect(hasEmailAudienceSplit(null)).to.be.false;
        });
    });

    describe('segmentParts', function () {
        it('splits a segment list into its parts', function () {
            expect(segmentParts('status:free,tier:gold')).to.deep.equal(['status:free', 'tier:gold']);
        });

        it('drops blanks and surrounding whitespace', function () {
            expect(segmentParts('status:free, ,status:-free')).to.deep.equal(['status:free', 'status:-free']);
        });

        it('handles an empty filter', function () {
            expect(segmentParts(null)).to.deep.equal([]);
        });
    });
});
