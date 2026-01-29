const assert = require('node:assert/strict');

const {OfferPercentageAmount, OfferFixedAmount, OfferTrialAmount} = require('../../../../../../../core/server/services/offers/domain/models/offer-amount');

describe('OfferAmount', function () {
    describe('OfferPercentageAmount', function () {
        describe('OfferPercentageAmount.create factory', function () {
            it('Will only create an OfferPercentageAmount containing an integer between 1 & 100 (inclusive)', function () {
                assert.throws(() => {
                    OfferPercentageAmount.create();
                }, OfferPercentageAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferPercentageAmount.create('1');
                }, OfferPercentageAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferPercentageAmount.create(-1);
                }, OfferPercentageAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferPercentageAmount.create(200);
                }, OfferPercentageAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferPercentageAmount.create(3.14);
                }, OfferPercentageAmount.InvalidOfferAmount);

                assert.doesNotThrow(() => {
                    OfferPercentageAmount.create(69);
                });
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferPercentageAmount.create(42);

            assert.equal(typeof cadence.value, 'number');
        });
    });

    describe('OfferFixedAmount', function () {
        describe('OfferFixedAmount.create factory', function () {
            it('Will only create an OfferFixedAmount containing an integer greater than 0', function () {
                assert.throws(() => {
                    OfferFixedAmount.create();
                }, OfferFixedAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferFixedAmount.create('1');
                }, OfferFixedAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferFixedAmount.create(-1);
                }, OfferFixedAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferFixedAmount.create(3.14);
                }, OfferFixedAmount.InvalidOfferAmount);

                assert.doesNotThrow(() => {
                    OfferFixedAmount.create(200);
                });
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferFixedAmount.create(42);

            assert.equal(typeof cadence.value, 'number');
        });
    });

    describe('OfferTrialAmount', function () {
        describe('OfferTrialAmount.create factory', function () {
            it('Will only create an OfferTrialAmount containing an integer greater than 0', function () {
                assert.throws(() => {
                    OfferTrialAmount.create();
                }, OfferTrialAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferTrialAmount.create('1');
                }, OfferTrialAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferTrialAmount.create(-1);
                }, OfferTrialAmount.InvalidOfferAmount);

                assert.throws(() => {
                    OfferTrialAmount.create(3.14);
                }, OfferTrialAmount.InvalidOfferAmount);

                assert.doesNotThrow(() => {
                    OfferTrialAmount.create(200);
                });
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferTrialAmount.create(42);

            assert.equal(typeof cadence.value, 'number');
        });
    });
});
