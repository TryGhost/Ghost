const assert = require('assert/strict');
const TiersAPI = require('../lib/TiersAPI');
const InMemoryTierRepository = require('../lib/InMemoryTierRepository');

describe('TiersAPI', function () {
    /** @type {TiersAPI.ITierRepository} */
    let repository;

    /** @type {TiersAPI} */
    let api;

    before(function () {
        repository = new InMemoryTierRepository();
        api = new TiersAPI({
            repository,
            slugService: {
                async generate(input) {
                    return input;
                }
            }
        });
    });

    it('Can not create new free Tiers', async function () {
        let error;
        try {
            await api.add({
                name: 'My testing Tier',
                type: 'free'
            });
            error = null;
        } catch (err) {
            error = err;
        } finally {
            assert(error, 'An error should have been thrown');
        }
    });

    it('Can create new paid Tiers and find them again', async function () {
        const tier = await api.add({
            name: 'My testing Tier',
            type: 'paid',
            monthlyPrice: 5000,
            yearlyPrice: 50000,
            currency: 'usd'
        });

        const found = await api.read(tier.id.toHexString());

        assert(found);
    });

    it('Can edit a tier', async function () {
        const tier = await api.add({
            name: 'My testing Tier',
            type: 'paid',
            monthlyPrice: 5000,
            yearlyPrice: 50000,
            currency: 'usd'
        });

        const updated = await api.edit(tier.id.toHexString(), {
            name: 'Updated'
        });

        assert(updated.name === 'Updated');
    });

    it('Can archive a tier', async function () {
        const tier = await api.add({
            name: 'My testing Tier',
            type: 'paid',
            monthlyPrice: 5000,
            yearlyPrice: 50000,
            currency: 'usd'
        });

        const updated = await api.edit(tier.id.toHexString(), {
            status: 'archived'
        });

        assert(updated.status === 'archived');
    });

    it('Can browse tiers', async function () {
        const page = await api.browse();

        assert(page.data.length === 3);
        assert(page.meta.pagination.total === 3);
    });

    it('Can read a default tier', async function () {
        const defaultTier = await api.readDefaultTier();

        assert.equal(defaultTier?.name, 'My testing Tier');
    });
});
