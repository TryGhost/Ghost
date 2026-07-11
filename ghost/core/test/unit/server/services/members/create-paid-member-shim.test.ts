import assert from 'node:assert/strict';
import sinon from 'sinon';
import {createPaidMemberShim} from '../../../../../core/server/services/members/create-paid-member-shim';

const models = require('../../../../../core/server/models');
const logging = require('@tryghost/logging');

describe('Unit - members/create-paid-member-shim', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('returns a paid member with every active paid tier', async function () {
        sinon.stub(models.Product, 'findAll').resolves([
            {get: (key: string) => (key === 'slug' ? 'silver' : undefined)},
            {get: (key: string) => (key === 'slug' ? 'gold' : undefined)}
        ]);

        const member = await createPaidMemberShim();

        assert.deepEqual(member, {status: 'paid', products: [{slug: 'silver'}, {slug: 'gold'}]});
    });

    it('falls back to a paid member with no tiers (never throws) when the tier lookup fails', async function () {
        const logError = sinon.stub(logging, 'error');
        sinon.stub(models.Product, 'findAll').rejects(new Error('db down'));

        const member = await createPaidMemberShim();

        // Security-sensitive: must still resolve to a safe member shape rather
        // than throwing — granting status:paid/members content but no
        // tier-specific blocks.
        assert.deepEqual(member, {status: 'paid', products: []});
        sinon.assert.calledOnce(logError);
    });
});
