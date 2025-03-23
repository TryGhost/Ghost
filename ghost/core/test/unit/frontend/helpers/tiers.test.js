const should = require('should');
const tiersHelper = require('../../../../core/frontend/helpers/tiers');

describe('{{tiers}} helper', function () {
    it('can return string with tiers', function () {
        const tiers = [
            {name: 'tier 1'},
            {name: 'tier 2'},
            {name: 'tier 3'}
        ];

        const rendered = tiersHelper.call({tiers: tiers}, {hash: {}});
        should.exist(rendered);

        String(rendered).should.equal('tier 1, tier 2 and tier 3 tiers');
    });

    it('can use a different separator', function () {
        const tiers = [
            {name: 'tier 1'},
            {name: 'tier 2'},
            {name: 'tier 3'}
        ];

        const rendered = tiersHelper.call({tiers: tiers}, {hash: {separator: '|'}});
        should.exist(rendered);

        String(rendered).should.equal('tier 1|tier 2 and tier 3 tiers');
    });

    it('can use a different final separator', function () {
        const tiers = [
            {name: 'tier 1'},
            {name: 'tier 2'},
            {name: 'tier 3'}
        ];

        const rendered = tiersHelper.call({tiers: tiers}, {hash: {lastSeparator: ' as well as '}});
        should.exist(rendered);

        String(rendered).should.equal('tier 1, tier 2 as well as tier 3 tiers');
    });

    it('can add a single prefix to multiple tiers', function () {
        const tiers = [
            {name: 'tier 1'},
            {name: 'tier 2'},
            {name: 'tier 3'}
        ];

        const rendered = tiersHelper.call({tiers: tiers}, {hash: {prefix: 'on '}});
        should.exist(rendered);

        String(rendered).should.equal('on tier 1, tier 2 and tier 3 tiers');
    });

    it('can add a single suffix to multiple tiers', function () {
        const tiers = [
            {name: 'tier 1'},
            {name: 'tier 2'},
            {name: 'tier 3'}
        ];

        const rendered = tiersHelper.call({tiers: tiers}, {hash: {suffix: ' products'}});
        should.exist(rendered);

        String(rendered).should.equal('tier 1, tier 2 and tier 3 products');
    });

    it('can override empty suffix to multiple tiers', function () {
        const tiers = [
            {name: 'tier 1'},
            {name: 'tier 2'},
            {name: 'tier 3'}
        ];

        const rendered = tiersHelper.call({tiers: tiers}, {hash: {suffix: ''}});
        should.exist(rendered);

        String(rendered).should.equal('tier 1, tier 2 and tier 3');
    });

    it('can add a prefix and suffix to multiple tiers', function () {
        const tiers = [
            {name: 'tier 1'},
            {name: 'tier 2'},
            {name: 'tier 3'}
        ];

        const rendered = tiersHelper.call({tiers: tiers}, {hash: {prefix: 'on ', suffix: ' products'}});
        should.exist(rendered);

        String(rendered).should.equal('on tier 1, tier 2 and tier 3 products');
    });

    it('can add a prefix and suffix with HTML', function () {
        const tiers = [
            {name: 'tier 1'},
            {name: 'tier 2'},
            {name: 'tier 3'}
        ];

        const rendered = tiersHelper.call({tiers: tiers}, {hash: {suffix: ' &bull;', prefix: '&hellip; '}});
        should.exist(rendered);

        String(rendered).should.equal('&hellip; tier 1, tier 2 and tier 3 &bull;');
    });

    it('does not add prefix or suffix if no tiers exist', function () {
        const rendered = tiersHelper.call({}, {hash: {prefix: 'on ', suffix: ' products'}});
        should.exist(rendered);

        String(rendered).should.equal('');
    });
});
