const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
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

    describe('onSaving', function () {
        it('skips labels without a name instead of throwing', async function () {
            const memberModel = new models.Member({email: 'test@example.com'});
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
            const findAllStub = sinon.stub(models.Label, 'findAll').resolves({
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
});
