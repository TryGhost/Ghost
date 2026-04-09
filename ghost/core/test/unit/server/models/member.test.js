const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const configUtils = require('../../../utils/config-utils');
const labs = require('../../../../core/shared/labs');
const knex = require('../../../../core/server/data/db').knex;

const config = configUtils.config;

describe('Unit: models/member', function () {
    const mockDb = require('mock-knex');
    let tracker;

    before(function () {
        models.init();
        mockDb.mock(knex);
        tracker = mockDb.getTracker();
    });

    beforeEach(function () {
        config.set('assetHash', '1');
    });

    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
    });

    after(function () {
        mockDb.unmock(knex);
    });

    describe('toJSON', function () {
        let toJSON;

        beforeEach(function () {
            toJSON = function (model, options) {
                return new models.Member(model).toJSON(options);
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

    describe('updateTierExpiry', function () {
        let memberModel;
        let updatePivot;

        beforeEach(function () {
            memberModel = new models.Member({email: 'text@example.com'});
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

    describe('filter', function () {
        it('generates correct query for subscription_count filter', function () {
            const queries = [];
            tracker.install();

            tracker.on('query', (query) => {
                queries.push(query);
                query.response([]);
            });

            return models.Member.findPage({
                filter: 'subscription_count:>1'
            }).then(() => {
                assert.equal(queries.length, 2);

                // The count query must alias the VIEW as subscription_counts so the
                // WHERE clause references the same name used in the LEFT JOIN.
                assert.ok(
                    queries[0].sql.includes('left join `members_subscription_counts` as `subscription_counts`'),
                    `Expected aliased JOIN in count query, got: ${queries[0].sql}`
                );
                assert.ok(
                    queries[0].sql.includes('`subscription_counts`.`subscription_count` > ?'),
                    `Expected WHERE to reference alias in count query, got: ${queries[0].sql}`
                );

                // The data query must also use the alias consistently.
                assert.ok(
                    queries[1].sql.includes('left join `members_subscription_counts` as `subscription_counts`'),
                    `Expected aliased JOIN in data query, got: ${queries[1].sql}`
                );
                assert.ok(
                    queries[1].sql.includes('`subscription_counts`.`subscription_count` > ?'),
                    `Expected WHERE to reference alias in data query, got: ${queries[1].sql}`
                );
            }).finally(() => {
                tracker.uninstall();
            });
        });
    });
});
