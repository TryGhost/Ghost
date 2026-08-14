const assert = require('node:assert/strict');
const BruteKnex = require('@tryghost/brute-knex');

const db = require('../../../../../../core/server/data/db');
const dbUtils = require('../../../../../utils/db-utils');

describe('BruteKnex store', function () {
    const key = 'brute-knex-store-test';

    beforeAll(async function () {
        await dbUtils.reset();
    });

    beforeEach(async function () {
        await dbUtils.truncate('brute');
    });

    afterEach(async function () {
        await dbUtils.truncate('brute');
    });

    it('stores, increments and resets rate limit entries through Ghost\'s brute table', async function () {
        const store = new BruteKnex({
            tablename: 'brute',
            createTable: false,
            knex: db.knex
        });

        await store.ready;

        const firstRequest = new Date('2026-01-01T00:00:00.000Z');
        const lastRequest = new Date('2026-01-01T00:01:00.000Z');

        await store.set(key, {
            firstRequest,
            lastRequest,
            count: 3
        }, 60);

        const row = await db.knex('brute').where({key}).first();
        assert.equal(row.key, key);
        assert.equal(Number(row.count), 3);

        const storedValue = await store.get(key);
        assert.equal(storedValue.count, 3);
        assert.equal(storedValue.firstRequest.getTime(), firstRequest.getTime());
        assert.equal(storedValue.lastRequest.getTime(), lastRequest.getTime());

        await store.increment(key, 60);

        const incrementedValue = await store.get(key);
        assert.equal(incrementedValue.count, 4);

        await new Promise((resolve, reject) => {
            store.reset(key, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });

        assert.equal(await store.get(key), null);
        assert.equal(await db.knex('brute').where({key}).first(), undefined);
    });
});
