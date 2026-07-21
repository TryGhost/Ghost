const assert = require('node:assert/strict');
const sinon = require('sinon');
const {Member} = require('../../../../core/server/models/member');
const {Label} = require('../../../../core/server/models/label');
const configUtils = require('../../../utils/config-utils');
const labs = require('../../../../core/shared/labs');

const config = configUtils.config;

describe('Unit: models/member', function () {
    beforeEach(function () {
        config.set('assetHash', '1');
    });

    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
    });

    describe('toJSON', function () {
        let toJSON;

        beforeEach(function () {
            toJSON = function (model, options) {
                return new Member(model).toJSON(options);
            };
        });

        it('avatar_image: generates gravatar url', function () {
            const member = {
                email: 'test@example.com'
            };

            config.set('privacy:useGravatar', true);
            const json = toJSON(member);

            assert.equal(json.avatar_image, `https://www.gravatar.com/avatar/55502f40dc8b7c769880b10874abc9d0?s=250&r=g&d=blank`);
        });

        it('avatar_image: skips gravatar when privacy.useGravatar=false', function () {
            const member = {
                email: 'test@example.com'
            };

            config.set('privacy:useGravatar', false);
            const json = toJSON(member);

            assert.equal(json.avatar_image, null);
        });
    });

    describe('onFetchingCollection: deep offset pagination', function () {
        const knex = require('knex');
        let db;

        beforeAll(function () {
            db = knex({client: 'mysql2'});
        });

        afterAll(async function () {
            await db.destroy();
        });

        function onFetchingCollection(qb) {
            new Member().onFetchingCollection(null, null, {query: qb});
        }

        it('rewrites deep-offset browse queries to a deferred join', function () {
            const qb = db('members')
                .where('members.status', 'free')
                .orderByRaw('created_at DESC, id DESC')
                .limit(100)
                .offset(10300);

            onFetchingCollection(qb);

            const sql = qb.toString();
            // filter, order and limit/offset all inside the id-only subquery
            assert.match(sql, /inner join \(select `members`\.`id` as `deep_page_id` from `members` where `members`\.`status` = 'free' order by created_at DESC, id DESC limit 100 offset 10300\) as `deep_page`/);
            // outer query keeps the order, drops the where/limit/offset
            assert.match(sql, /`deep_page`\.`deep_page_id` order by created_at DESC, id DESC$/);
            assert.equal(sql.indexOf('offset 10300'), sql.lastIndexOf('offset 10300'));
        });

        it('rewrites deep-offset queries whose filters contain subquery joins', function () {
            // NQL label/tier filters compile to `where members.id in (select
            // ... join ...)` — joins inside parens are not a different query
            // shape and must not block the rewrite
            const labelSubquery = db('members_labels')
                .select('members_labels.member_id')
                .innerJoin('labels', 'labels.id', 'members_labels.label_id')
                .where('labels.slug', 'vip');
            const qb = db('members')
                .whereIn('members.id', labelSubquery)
                .orderByRaw('created_at DESC, id DESC')
                .limit(100)
                .offset(10300);

            onFetchingCollection(qb);

            assert.ok(qb.toString().includes('deep_page'), 'filtered deep pages should still be rewritten');
        });

        it('leaves shallow pages untouched', function () {
            const qb = db('members').orderByRaw('created_at DESC, id DESC').limit(100).offset(999);
            const original = qb.toString();

            onFetchingCollection(qb);

            assert.equal(qb.toString(), original);
        });

        it('rewrites at exactly the threshold offset', function () {
            const qb = db('members').orderByRaw('created_at DESC, id DESC').limit(100).offset(1000);

            onFetchingCollection(qb);

            assert.ok(qb.toString().includes('deep_page'), 'offset 1000 should trigger the rewrite');
        });

        it('leaves queries without numeric limit/offset untouched', function () {
            const qb = db('members').where('members.status', 'free');
            const original = qb.toString();

            onFetchingCollection(qb);

            assert.equal(qb.toString(), original);
        });

        it('leaves non-browse query shapes untouched', function () {
            const unsafe = [
                db('members').innerJoin('members_labels', 'members.id', 'members_labels.member_id').limit(100).offset(10300),
                db('members').groupBy('status').limit(100).offset(10300),
                db('members').select(db.raw('members.*, 1 as extra')).limit(100).offset(10300),
                db('members').limit(100).offset(10300).forUpdate()
            ];

            for (const qb of unsafe) {
                const original = qb.toString();
                onFetchingCollection(qb);
                assert.equal(qb.toString(), original);
            }
        });
    });

    describe('onSaving', function () {
        it('skips labels without a name instead of throwing', async function () {
            const memberModel = new Member({email: 'test@example.com'});
            // Simulate input from API where one label is missing `name`
            memberModel.set('labels', [
                {name: 'Newsletter'},
                {id: 'abc123'}, // no name
                {name: '   '}, // whitespace only -> trimmed to ''
                {name: 'newsletter'} // case-insensitive duplicate
            ]);

            // Stub Label.findAll to return a collection with a pre-existing label
            // so the buggy `.toLowerCase()` path on member.js:351 is exercised.
            const existingLabels = [{
                id: 'existing-1',
                get: key => (key === 'name' ? 'Existing' : 'existing-1')
            }];
            const findAllStub = sinon.stub(Label, 'findAll').resolves({
                models: existingLabels
            });

            await memberModel.onSaving(memberModel, memberModel.attributes, {});

            const finalLabels = memberModel.get('labels');
            assert.equal(finalLabels.length, 1, 'only the valid label should remain');
            assert.equal(finalLabels[0].name, 'Newsletter');
            sinon.assert.calledOnce(findAllStub);
        });
    });

    describe('updateTierExpiry', function () {
        let memberModel;
        let updatePivot;

        beforeEach(function () {
            memberModel = new Member({email: 'text@example.com'});
            updatePivot = sinon.stub();

            sinon.stub(memberModel, 'products').callsFake(() => {
                return {
                    updatePivot: updatePivot
                };
            });
            sinon.stub(labs, 'isSet').returns(true);
        });

        it('calls updatePivot on member products to set expiry', function () {
            const expiry = (new Date()).toISOString();
            memberModel.updateTierExpiry([{
                expiry_at: expiry,
                id: '1'
            }]);

            sinon.assert.calledWith(updatePivot, {expiry_at: new Date(expiry)}, {query: {where: {product_id: '1'}}});
        });

        it('calls updatePivot on member products to remove expiry', function () {
            memberModel.updateTierExpiry([{
                id: '1'
            }]);

            sinon.assert.calledWith(updatePivot, {expiry_at: null}, {query: {where: {product_id: '1'}}});
        });
    });
});
