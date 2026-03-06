const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../../utils/assertions');
const ObjectID = require('bson-objectid').default;
const errors = require('../../../../../../../core/server/services/offers/domain/errors');
const Offer = require('../../../../../../../core/server/services/offers/domain/models/offer');
const OfferName = require('../../../../../../../core/server/services/offers/domain/models/offer-name');
const OfferCode = require('../../../../../../../core/server/services/offers/domain/models/offer-code');

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
            assert(offer instanceof Offer, 'Offer.create should return an instance of Offer');
        });

        it('Stores stripe_coupon_id when provided', async function () {
            const offer = await Offer.create({
                name: 'My Offer',
                code: 'offer-code',
                display_title: 'My Offer Title',
                display_description: 'My Offer Description',
                cadence: 'month',
                type: 'percent',
                amount: 10,
                duration: 'forever',
                tier: {
                    id: ObjectID()
                },
                stripe_coupon_id: 'coupon_123'
            }, mockUniqueChecker);

            assert.equal(offer.stripeCouponId, 'coupon_123');
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
            assert(offer instanceof Offer, 'Offer.create should return an instance of Offer');
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
                assert.fail('Expected an error');
            }, (err) => {
                assert(err);
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
                assert.fail('Expected an error');
            }, (err) => {
                assert(err);
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
                assert.fail('Expected an error');
            }, (err) => {
                assert(err);
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

            assert(offer.name.equals(OfferName.create(data.name)));
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
                assert.fail();
            } catch (err) {
                assert(err instanceof errors.InvalidOfferDuration);
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

            assert.equal(offer.currency, null);
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

            assert.equal(offer.currency, null);
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
                assert.fail('Expected an error');
            }, (err) => {
                assert(err);
            });
        });

        it('Sets createdAt for new Offers', async function () {
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

            assert.equal(typeof offer.createdAt, 'string');
        });
    });

    describe('Tier and redemption type validation', function () {
        it('Creates a retention offer with null tier', async function () {
            const offer = await Offer.create({
                id: ObjectID(),
                name: 'Retention Offer',
                code: 'retention-offer',
                display_title: 'Stay with us',
                display_description: 'A discount for staying',
                cadence: 'month',
                type: 'percent',
                amount: 10,
                duration: 'forever',
                redemption_type: 'retention',
                tier: null
            }, mockUniqueChecker);

            assert(offer instanceof Offer);
            assert.equal(offer.tier, null);
            assert.equal(offer.redemptionType.value, 'retention');
        });

        it('Throws when creating a retention offer with a tier', async function () {
            try {
                await Offer.create({
                    id: ObjectID(),
                    name: 'Bad Retention Offer',
                    code: 'bad-retention',
                    display_title: '',
                    display_description: '',
                    cadence: 'month',
                    type: 'percent',
                    amount: 10,
                    duration: 'forever',
                    redemption_type: 'retention',
                    tier: {
                        id: ObjectID()
                    }
                }, mockUniqueChecker);
                assert.fail('Expected an error');
            } catch (err) {
                assert(err instanceof errors.InvalidOfferTier);
            }
        });

        it('Throws when creating a signup offer without a tier', async function () {
            try {
                await Offer.create({
                    id: ObjectID(),
                    name: 'Bad Signup Offer',
                    code: 'bad-signup',
                    display_title: '',
                    display_description: '',
                    cadence: 'month',
                    type: 'percent',
                    amount: 10,
                    duration: 'forever',
                    redemption_type: 'signup',
                    tier: null
                }, mockUniqueChecker);
                assert.fail('Expected an error');
            } catch (err) {
                assert(err instanceof errors.InvalidOfferTier);
            }
        });

        it('Throws when creating an offer without a tier and no redemption_type (defaults to signup)', async function () {
            try {
                await Offer.create({
                    id: ObjectID(),
                    name: 'No Tier Default',
                    code: 'no-tier-default',
                    display_title: '',
                    display_description: '',
                    cadence: 'month',
                    type: 'percent',
                    amount: 10,
                    duration: 'forever',
                    tier: null
                }, mockUniqueChecker);
                assert.fail('Expected an error');
            } catch (err) {
                assert(err instanceof errors.InvalidOfferTier);
            }
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
                assert.fail('Expected an error');
            }, (err) => {
                assert(err);
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
                assert.fail('Expected an error');
            }, (err) => {
                assert(err);
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
                assert.fail('Expected an error');
            }, (err) => {
                assert(err);
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

            assertExists(offer.id);
            assertExists(offer.name);
            assertExists(offer.code);
            assertExists(offer.currency);
            assertExists(offer.duration);
            assertExists(offer.status);
            assertExists(offer.redemptionCount);
            assertExists(offer.displayTitle);
            assertExists(offer.displayDescription);
            assertExists(offer.tier);
            assertExists(offer.cadence);
            assertExists(offer.type);
            assertExists(offer.amount);
            assertExists(offer.isNew);
        });
    });

    describe('Offer#createFromStripeCoupon factory', function () {
        it('Creates a valid percent off offer from a Stripe coupon', async function () {
            const tier = {
                id: ObjectID(),
                name: 'Gold'
            };

            const stripeCoupon = {
                id: 'stripe_coupon_abc',
                percent_off: 25,
                duration: 'forever'
            };

            const offer = await Offer.createFromStripeCoupon(stripeCoupon, 'month', tier, mockUniqueChecker);

            assert(offer instanceof Offer);
            assert.equal(offer.code.value, 'stripe_coupon_abc');
            assert.equal(offer.status.value, 'archived');
            assert.equal(offer.stripeCouponId, 'stripe_coupon_abc');
            assert.equal(offer.type.value, 'percent');
            assert.equal(offer.amount.value, 25);
            assert.equal(offer.name.value, '25% off forever (stripe_coupon_abc)');
            assert.equal(offer.displayTitle.value, '25% off forever (stripe_coupon_abc)');
            assert.equal(offer.displayDescription.value, '');
        });

        it('Creates a valid fixed amount offer from a Stripe coupon', async function () {
            const tier = {
                id: ObjectID(),
                name: 'Gold'
            };

            const stripeCoupon = {
                id: 'fixed_coupon_xyz',
                amount_off: 1000,
                currency: 'usd',
                duration: 'once'
            };

            const offer = await Offer.createFromStripeCoupon(stripeCoupon, 'year', tier, mockUniqueChecker);

            assert(offer instanceof Offer);
            assert.equal(offer.code.value, 'fixed_coupon_xyz');
            assert.equal(offer.status.value, 'archived');
            assert.equal(offer.stripeCouponId, 'fixed_coupon_xyz');
            assert.equal(offer.type.value, 'fixed');
            assert.equal(offer.amount.value, 1000);
            assert.equal(offer.currency.value, 'USD');
            assert.equal(offer.name.value, 'USD 10 off once (fixed_coupon_xyz)');
        });

        it('Generates correct name for repeating duration with months', async function () {
            const tier = {
                id: ObjectID(),
                name: 'Silver'
            };

            const stripeCoupon = {
                id: 'SUMMER25',
                percent_off: 15,
                duration: 'repeating',
                duration_in_months: 6
            };

            const offer = await Offer.createFromStripeCoupon(stripeCoupon, 'month', tier, mockUniqueChecker);

            assert.equal(offer.name.value, '15% off for 6 months (SUMMER25)');
            assert.equal(offer.code.value, 'summer25');
            assert.equal(offer.status.value, 'archived');
        });

        it('Generates correct name for percent off with "once" duration', async function () {
            const tier = {
                id: ObjectID(),
                name: 'Basic'
            };

            const stripeCoupon = {
                id: 'WELCOME10',
                percent_off: 10,
                duration: 'once'
            };

            const offer = await Offer.createFromStripeCoupon(stripeCoupon, 'month', tier, mockUniqueChecker);

            assert.equal(offer.name.value, '10% off once (WELCOME10)');
        });

        it('Generates correct name for fixed amount with "forever" duration', async function () {
            const tier = {
                id: ObjectID(),
                name: 'Premium'
            };

            const stripeCoupon = {
                id: 'FLAT5OFF',
                amount_off: 500,
                currency: 'eur',
                duration: 'forever'
            };

            const offer = await Offer.createFromStripeCoupon(stripeCoupon, 'year', tier, mockUniqueChecker);

            assert.equal(offer.name.value, 'EUR 5 off forever (FLAT5OFF)');
        });

        it('Generates correct name for fixed amount with repeating duration', async function () {
            const tier = {
                id: ObjectID(),
                name: 'Gold'
            };

            const stripeCoupon = {
                id: 'SAVE3MONTHS',
                amount_off: 250,
                currency: 'gbp',
                duration: 'repeating',
                duration_in_months: 3
            };

            const offer = await Offer.createFromStripeCoupon(stripeCoupon, 'month', tier, mockUniqueChecker);

            assert.equal(offer.name.value, 'GBP 2.5 off for 3 months (SAVE3MONTHS)');
        });

        it('Sets cadence correctly from parameter', async function () {
            const tier = {
                id: ObjectID(),
                name: 'Basic'
            };

            const stripeCoupon = {
                id: 'monthly_coupon',
                percent_off: 10,
                duration: 'forever'
            };

            const monthlyOffer = await Offer.createFromStripeCoupon(stripeCoupon, 'month', tier, mockUniqueChecker);
            assert.equal(monthlyOffer.cadence.value, 'month');

            const yearlyOffer = await Offer.createFromStripeCoupon(
                {...stripeCoupon, id: 'yearly_coupon'},
                'year',
                tier,
                mockUniqueChecker
            );
            assert.equal(yearlyOffer.cadence.value, 'year');
        });

        it('Associates offer with provided tier', async function () {
            const tierId = ObjectID();
            const tier = {
                id: tierId,
                name: 'Premium'
            };

            const stripeCoupon = {
                id: 'tier_test_coupon',
                percent_off: 5,
                duration: 'once'
            };

            const offer = await Offer.createFromStripeCoupon(stripeCoupon, 'month', tier, mockUniqueChecker);

            assert.equal(offer.tier.id, tierId.toHexString());
            assert.equal(offer.tier.name, 'Premium');
        });

        it('Is marked as a new offer', async function () {
            const tier = {
                id: ObjectID(),
                name: 'Gold'
            };

            const stripeCoupon = {
                id: 'new_coupon_test',
                percent_off: 20,
                duration: 'forever'
            };

            const offer = await Offer.createFromStripeCoupon(stripeCoupon, 'month', tier, mockUniqueChecker);

            assert.equal(offer.isNew, true);
        });
    });
});
