import upgradeUrl from 'ghost-admin/utils/upgrade-url';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit | Utility | upgrade-url', function () {
    const configWith = url => ({hostSettings: {billing: {upgradeUrl: url}}});

    it('falls back to Ghost(Pro) billing when nothing is configured', function () {
        expect(upgradeUrl({})).to.equal('#/pro');
        expect(upgradeUrl(configWith(undefined))).to.equal('#/pro');
    });

    // the publish-limit modal linked straight into checkout before this was configurable
    it('uses the caller\'s fallback when one is given', function () {
        expect(upgradeUrl({}, '#/pro?action=checkout')).to.equal('#/pro?action=checkout');
    });

    it('keeps a configured hash href as-is', function () {
        expect(upgradeUrl(configWith('#/pro/billing/plans'))).to.equal('#/pro/billing/plans');
    });

    it('keeps a configured billing URL as-is', function () {
        expect(upgradeUrl(configWith('https://billing.example.com'))).to.equal('https://billing.example.com');
    });

    // an unanchored value would resolve against whatever page it is rendered on
    it('anchors a value that is neither a hash nor a URL', function () {
        expect(upgradeUrl(configWith('pro/billing'))).to.equal('#/pro/billing');
        expect(upgradeUrl(configWith('/pro/billing'))).to.equal('#/pro/billing');
    });

    it('rejects a scheme that is not http(s)', function () {
        expect(upgradeUrl(configWith('javascript:alert(1)'))).to.equal('#/pro');  
        expect(upgradeUrl(configWith('data:text/html,hi'))).to.equal('#/pro');
    });
});
