const assert = require('node:assert/strict');
const crypto = require('crypto');

const testUtils = require('../../utils');
const BaseModel = require('../../../core/server/models/base');
const {Member} = require('../../../core/server/models/member');
const knex = require('../../../core/server/data/db').knex;

describe('Member Model: deep offset pagination', function () {
    // Deep pages (offset > 1000) trigger the deferred-join rewrite in
    // Member.onFetchingCollection — verify rows/order/meta match plain
    // LIMIT/OFFSET pagination and shallow pages are untouched
    const TOTAL = 1300;
    const PAGE_SIZE = 50;
    const DEEP_PAGE = 22; // offset 1050, above the 1000 threshold
    const BROWSE_ORDER = 'created_at DESC, id DESC';

    // idx 0..TOTAL-1, created_at strictly increasing with idx, so
    // created_at DESC === descending idx. Every 10th member is comped.
    let seededEmails;

    beforeAll(testUtils.teardownDb);
    beforeAll(testUtils.setup());
    afterAll(testUtils.teardownDb);

    beforeAll(async function () {
        const base = new Date('2020-01-01T00:00:00Z').getTime();
        const rows = [];
        seededEmails = [];

        for (let idx = 0; idx < TOTAL; idx++) {
            const memberEmail = `member-${String(idx).padStart(5, '0')}@example.com`;
            const createdAt = new Date(base + idx * 60000).toISOString().slice(0, 19).replace('T', ' ');
            seededEmails.push(memberEmail);
            rows.push({
                id: BaseModel.Model.generateId(),
                uuid: crypto.randomUUID(),
                transient_id: crypto.randomUUID(),
                email: memberEmail,
                name: `Member ${idx}`,
                status: idx % 10 === 0 ? 'comped' : 'free',
                created_at: createdAt,
                updated_at: createdAt
            });
        }

        await knex.batchInsert('members', rows, 200);
    });

    async function findPageCapturingSql(options) {
        const sqls = [];
        const onQuery = data => sqls.push(data.sql);

        knex.on('query', onQuery);
        try {
            const page = await Member.findPage(options);
            return {page, sqls};
        } finally {
            knex.removeListener('query', onQuery);
        }
    }

    function pageEmails(page) {
        return page.data.map(model => model.get('email'));
    }

    it('returns the correct rows, order and meta on a deep page', async function () {
        const {page, sqls} = await findPageCapturingSql({
            limit: PAGE_SIZE,
            page: DEEP_PAGE,
            autoOrder: BROWSE_ORDER
        });

        assert.ok(sqls.some(sql => sql.includes('deep_page')), 'deferred join rewrite should be active on a deep page');

        const offset = PAGE_SIZE * (DEEP_PAGE - 1);
        const expected = [...seededEmails].reverse().slice(offset, offset + PAGE_SIZE);

        assert.deepEqual(pageEmails(page), expected);
        assert.equal(page.meta.pagination.total, TOTAL);
        assert.equal(page.meta.pagination.page, DEEP_PAGE);
        assert.equal(page.meta.pagination.limit, PAGE_SIZE);
    });

    it('applies NQL filters correctly on deep pages', async function () {
        const {page} = await findPageCapturingSql({
            limit: PAGE_SIZE,
            page: DEEP_PAGE,
            autoOrder: BROWSE_ORDER,
            filter: 'status:free'
        });

        const freeEmails = seededEmails.filter((_email, idx) => idx % 10 !== 0);
        const offset = PAGE_SIZE * (DEEP_PAGE - 1);
        const expected = [...freeEmails].reverse().slice(offset, offset + PAGE_SIZE);

        assert.deepEqual(pageEmails(page), expected);
        assert.equal(page.meta.pagination.total, freeEmails.length);
    });

    it('applies a user-specified order correctly on deep pages', async function () {
        const {page, sqls} = await findPageCapturingSql({
            limit: PAGE_SIZE,
            page: DEEP_PAGE,
            order: 'email asc'
        });

        assert.ok(sqls.some(sql => sql.includes('deep_page')), 'deferred join rewrite should be active on a deep page');

        // emails are zero-padded, so email ASC === seed order
        const offset = PAGE_SIZE * (DEEP_PAGE - 1);
        const expected = seededEmails.slice(offset, offset + PAGE_SIZE);

        assert.deepEqual(pageEmails(page), expected);
        assert.equal(page.meta.pagination.total, TOTAL);
    });

    it('does not rewrite shallow pages and returns the correct rows', async function () {
        const {page, sqls} = await findPageCapturingSql({
            limit: PAGE_SIZE,
            page: 1,
            autoOrder: BROWSE_ORDER
        });

        assert.ok(!sqls.some(sql => sql.includes('deep_page')), 'shallow pages should not be rewritten');

        const expected = [...seededEmails].reverse().slice(0, PAGE_SIZE);
        assert.deepEqual(pageEmails(page), expected);
        assert.equal(page.meta.pagination.total, TOTAL);
    });
});
