const assert = require('node:assert/strict');
const {isPurchasableEntry} = require('../../../../../core/server/services/machine-payments/eligibility');

describe('Unit: server/services/machine-payments/eligibility', function () {
    it('treats visibility paid as purchasable', function () {
        assert.equal(isPurchasableEntry({visibility: 'paid'}), true);
    });

    it('treats all-paid tiers as purchasable', function () {
        assert.equal(isPurchasableEntry({
            visibility: 'tiers',
            tiers: [{type: 'paid'}, {type: 'paid'}]
        }), true);
    });

    it('rejects tiers mixes that include free', function () {
        assert.equal(isPurchasableEntry({
            visibility: 'tiers',
            tiers: [{type: 'paid'}, {type: 'free'}]
        }), false);
    });

    it('rejects members-only and public', function () {
        assert.equal(isPurchasableEntry({visibility: 'members'}), false);
        assert.equal(isPurchasableEntry({visibility: 'public'}), false);
    });
});
