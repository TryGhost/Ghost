require('should');
const sinon = require('sinon');
const ObjectID = require('bson-objectid').default;
const OffersAPI = require('../../../../../../core/server/services/offers/application/OffersAPI');

describe('OffersAPI', function () {
    afterEach(function () {
        sinon.restore();
    });

    function buildOfferData() {
        return {
            name: 'Coupon Offer',
            code: 'coupon-code',
            display_title: 'Coupon Offer',
            display_description: '',
            cadence: 'month',
            type: 'percent',
            amount: 10,
            duration: 'forever',
            tier: {
                id: ObjectID().toHexString()
            },
            stripe_coupon_id: 'coupon-code'
        };
    }

    it('reuses provided transaction when creating offer', async function () {
        const tx = {};
        const repository = {
            createTransaction: sinon.stub().rejects(new Error('should not open new transaction')),
            save: sinon.stub().resolves(),
            existsByCode: sinon.stub().resolves(false),
            existsByName: sinon.stub().resolves(false)
        };

        const api = new OffersAPI(repository);

        const result = await api.createOffer(buildOfferData(), {transacting: tx});

        repository.createTransaction.called.should.be.false();
        repository.save.calledOnce.should.be.true();
        repository.save.firstCall.args[1].transacting.should.equal(tx);
        result.id.should.be.ok();
    });

    it('opens transaction when none provided', async function () {
        const repository = {
            createTransaction: sinon.stub().callsFake(async cb => cb('tx-created')),
            save: sinon.stub().resolves(),
            existsByCode: sinon.stub().resolves(false),
            existsByName: sinon.stub().resolves(false)
        };

        const api = new OffersAPI(repository);

        await api.createOffer(buildOfferData());

        repository.createTransaction.calledOnce.should.be.true();
        repository.save.firstCall.args[1].transacting.should.equal('tx-created');
    });
});

