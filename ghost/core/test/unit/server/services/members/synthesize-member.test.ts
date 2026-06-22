import assert from 'node:assert/strict';
import sinon from 'sinon';

const models = require('../../../../../core/server/models');
const logging = require('@tryghost/logging');
const synthesizePaidMember = require('../../../../../core/server/services/members/synthesize-member') as () => Promise<{status: string; products: Array<{slug: string}>}>;

describe('Unit - members/synthesize-member', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('returns a paid member with every active paid tier', async function () {
        sinon.stub(models.Product, 'findAll').resolves([
            {get: (key: string) => (key === 'slug' ? 'silver' : undefined)},
            {get: (key: string) => (key === 'slug' ? 'gold' : undefined)}
        ]);

        const member = await synthesizePaidMember();

        assert.deepEqual(member, {status: 'paid', products: [{slug: 'silver'}, {slug: 'gold'}]});
    });

    it('falls back to a paid member with no tiers (never throws) when the tier lookup fails', async function () {
        const logError = sinon.stub(logging, 'error');
        sinon.stub(models.Product, 'findAll').rejects(new Error('db down'));

        const member = await synthesizePaidMember();

        // Security-sensitive: must still resolve to a safe member shape rather
        // than throwing — granting status:paid/members content but no
        // tier-specific blocks.
        assert.deepEqual(member, {status: 'paid', products: []});
        sinon.assert.calledOnce(logError);
    });
});
