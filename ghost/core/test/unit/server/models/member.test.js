const sinon = require('sinon');
const should = require('should');
const models = require('../../../../core/server/models');
const configUtils = require('../../../utils/configUtils');
const labs = require('../../../../core/shared/labs');

const config = configUtils.config;

describe('Unit: models/member', function () {
    before(function () {
        models.init();
    });

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

            json.avatar_image.should.eql(`https://www.gravatar.com/avatar/55502f40dc8b7c769880b10874abc9d0?s=250&r=g&d=blank`);
        });

        it('avatar_image: skips gravatar when privacy.useGravatar=false', function () {
            const member = {
                email: 'test@example.com'
            };

            config.set('privacy:useGravatar', false);
            const json = toJSON(member);

            should(json.avatar_image).eql(null);
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

            updatePivot.calledWith({expiry_at: new Date(expiry)}, {query: {where: {product_id: '1'}}}).should.be.true();
        });

        it('calls updatePivot on member products to remove expiry', function () {
            memberModel.updateTierExpiry([{
                id: '1'
            }]);

            updatePivot.calledWith({expiry_at: null}, {query: {where: {product_id: '1'}}}).should.be.true();
        });
    });
});
