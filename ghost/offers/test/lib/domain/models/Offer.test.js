const should = require('should');
const ObjectID = require('bson-objectid').default;
const errors = require('../../../../lib/domain/errors');
const Offer = require('../../../../lib/domain/models/Offer');
const OfferName = require('../../../../lib/domain/models/OfferName');
const OfferCode = require('../../../../lib/domain/models/OfferCode');

function createUniqueChecker(dupe) {
    return {
        async isUniqueCode(code) {
            return code.value !== dupe;
        },
        async isUniqueName(name) {
            return name.value !== dupe;
        }
    };
}

const mockUniqueChecker = createUniqueChecker('dupe');

describe('Offer', function () {
    describe('Offer#create factory', function () {
        it('Creates a valid instance of an Offer', async function () {
            const offer = await Offer.create({
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'fixed',
                amount: 1000,
                duration: 'forever',
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            }, mockUniqueChecker);
            should.ok(
                offer instanceof Offer,
                'Offer.create should return an instance of Offer'
            );
        });

        it('Creates a valid instance of a trial Offer', async function () {
            const offer = await Offer.create({
                name: 'My Trial Offer',
                code: 'offer-code-trial',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'trial',
                amount: 10,
                duration: 'trial',
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            }, mockUniqueChecker);
            should.ok(
                offer instanceof Offer,
                'Offer.create should return an instance of Offer'
            );
        });

        it('Throws an error if the duration for trial offer is not right', async function () {
            await Offer.create({
                name: 'My Trial Offer',
                code: 'trial-test',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'trial',
                amount: 10,
                duration: 'forever',
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            }, mockUniqueChecker).then(() => {
                should.fail('Expected an error');
            }, (err) => {
                should.ok(err);
            });
        });

        it('Throws an error if the code is not unique', async function () {
            await Offer.create({
                name: 'My Offer',
                code: 'dupe',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'fixed',
                amount: 1000,
                duration: 'forever',
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            }, mockUniqueChecker).then(() => {
                should.fail('Expected an error');
            }, (err) => {
                should.ok(err);
            });
        });

        it('Throws an error if the name is not unique', async function () {
            await Offer.create({
                name: 'dupe',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'fixed',
                amount: 1000,
                duration: 'forever',
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            }, mockUniqueChecker).then(() => {
                should.fail('Expected an error');
            }, (err) => {
                should.ok(err);
            });
        });

        it('Wraps the input values in value objects', async function () {
            const data = {
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'fixed',
                amount: 1000,
                duration: 'forever',
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            const offer = await Offer.create(data, mockUniqueChecker);

            should.ok(offer.name.equals(OfferName.create(data.name)));
        });

        it('Errors if the repeating duration is applied to the year cadence', async function () {
            const data = {
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'year',
                type: 'fixed',
                amount: 1000,
                duration: 'repeating',
                duration_in_months: 12,
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            try {
                await Offer.create(data, mockUniqueChecker);
                should.fail();
            } catch (err) {
                should.ok(err instanceof errors.InvalidOfferDuration);
            }
        });

        it('Has a currency of null if the type is percent', async function () {
            const data = {
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'year',
                type: 'percent',
                amount: 20,
                duration: 'once',
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            const offer = await Offer.create(data, mockUniqueChecker);

            should.equal(offer.currency, null);
        });

        it('Has a currency of null if the type is trial', async function () {
            const data = {
                name: 'My Trial Offer',
                code: 'offer-code-trial',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'year',
                type: 'trial',
                amount: 20,
                duration: 'trial',
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            const offer = await Offer.create(data, mockUniqueChecker);

            should.equal(offer.currency, null);
        });

        it('Can handle ObjectID, string and no id', async function () {
            const data = {
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'year',
                type: 'percent',
                amount: 20,
                duration: 'once',
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            await Offer.create({...data, id: ObjectID()}, mockUniqueChecker);
            await Offer.create({...data, id: ObjectID().toHexString()}, mockUniqueChecker);
            await Offer.create({...data, id: undefined}, mockUniqueChecker);
        });

        it('Does not accept a redemptionCount for new Offers', async function () {
            const data = {
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'fixed',
                amount: 1000,
                duration: 'repeating',
                duration_in_months: 12,
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            await Offer.create(data, mockUniqueChecker);

            await Offer.create({...data, redemptionCount: 2}, mockUniqueChecker).then(() => {
                should.fail('Expected an error');
            }, (err) => {
                should.ok(err);
            });
        });
    });

    describe('#updateCode', function () {
        it('Requires the code to be unique if it has changed', async function () {
            const data = {
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'fixed',
                amount: 1000,
                duration: 'repeating',
                duration_in_months: 12,
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            const offer = await Offer.create(data, mockUniqueChecker);

            await offer.updateCode(OfferCode.create('dupe'), mockUniqueChecker).then(() => {
                should.fail('Expected an error');
            }, (err) => {
                should.ok(err);
            });

            const offer2 = await Offer.create({...data, code: 'dupe'}, createUniqueChecker());

            await offer2.updateCode(OfferCode.create('dupe'), mockUniqueChecker);
        });

        it('Does not allow code to be changed twice', async function () {
            const data = {
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'fixed',
                amount: 1000,
                duration: 'repeating',
                duration_in_months: 12,
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            const offer = await Offer.create(data, mockUniqueChecker);

            await offer.updateCode(OfferCode.create('changed'), mockUniqueChecker);
            await offer.updateCode(OfferCode.create('changed-again'), mockUniqueChecker).then(() => {
                should.fail('Expected an error');
            }, (err) => {
                should.ok(err);
            });
        });
    });

    describe('#updateName', function () {
        it('Requires the name to be unique if it has changed', async function () {
            const data = {
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'fixed',
                amount: 1000,
                duration: 'repeating',
                duration_in_months: 12,
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            const offer = await Offer.create(data, mockUniqueChecker);

            await offer.updateName(OfferName.create('Unique!'), mockUniqueChecker);

            await offer.updateName(OfferName.create('dupe'), mockUniqueChecker).then(() => {
                should.fail('Expected an error');
            }, (err) => {
                should.ok(err);
            });

            const offer2 = await Offer.create({...data, name: 'dupe'}, createUniqueChecker());

            await offer2.updateName(OfferName.create('dupe'), mockUniqueChecker);
        });
    });

    describe('Properties', function () {
        it('Exposes getters for its properties', async function () {
            const data = {
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'fixed',
                amount: 1000,
                duration: 'repeating',
                duration_in_months: 12,
                currency: 'USD',
                tier: {
                    id: ObjectID()
                }
            };

            const offer = await Offer.create(data, mockUniqueChecker);

            should.exist(offer.id);
            should.exist(offer.name);
            should.exist(offer.code);
            should.exist(offer.currency);
            should.exist(offer.duration);
            should.exist(offer.status);
            should.exist(offer.redemptionCount);
            should.exist(offer.displayTitle);
            should.exist(offer.displayDescription);
            should.exist(offer.tier);
            should.exist(offer.cadence);
            should.exist(offer.type);
            should.exist(offer.amount);
            should.exist(offer.isNew);
        });
    });
});
