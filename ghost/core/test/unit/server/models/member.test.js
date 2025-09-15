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

        it('avatar_image: generates SVG avatar', function () {
            const member = {
                email: 'test@example.com',
                name: 'Test User'
            };

            const json = toJSON(member);

            json.avatar_image.should.startWith('data:image/svg+xml;base64,');
            // Decode base64 and check it contains expected initials
            const base64Part = json.avatar_image.split(',')[1];
            const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
            decoded.should.containEql('TU'); // Initials for "Test User"
        });

        it('avatar_image: generates SVG avatar from email when no name', function () {
            const member = {
                email: 'test@example.com'
            };

            const json = toJSON(member);

            json.avatar_image.should.startWith('data:image/svg+xml;base64,');
            // Decode base64 and check it contains expected initial
            const base64Part = json.avatar_image.split(',')[1];
            const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
            decoded.should.containEql('T'); // Initial for "test"
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
