import webPaywallAudience from 'ghost-admin/utils/web-paywall-audience';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit: Util: web-paywall-audience', function () {
    it('stops nobody on a public post', function () {
        expect(webPaywallAudience({visibility: 'public'})).to.be.null;
    });

    it('treats an unset visibility as public', function () {
        expect(webPaywallAudience({})).to.be.null;
        expect(webPaywallAudience(undefined)).to.be.null;
    });

    it('stops only logged-out readers on a members post', function () {
        expect(webPaywallAudience({visibility: 'members'})).to.equal('public visitors');
    });

    it('stops free members as well on a paid post', function () {
        expect(webPaywallAudience({visibility: 'paid'}))
            .to.equal('free members and public visitors');
    });

    it('names the tiers that get through', function () {
        expect(webPaywallAudience({
            visibility: 'tiers',
            tiers: [{name: 'Gold'}, {name: 'Silver'}]
        })).to.equal('members outside Gold, Silver');
    });

    it('falls back when a tier-gated post has no tiers to name', function () {
        expect(webPaywallAudience({visibility: 'tiers', tiers: []}))
            .to.equal('members outside the selected tiers');
    });
});
