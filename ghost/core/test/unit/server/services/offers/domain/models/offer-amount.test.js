const assert = require('node:assert/strict');

const {OfferPercentageAmount, OfferFixedAmount, OfferTrialAmount, OfferFreeMonthsAmount} = require('../../../../../../../core/server/services/offers/domain/models/offer-amount');

describe('OfferAmount', function () {
    describe('OfferPercentageAmount', function () {
        describe('OfferPercentageAmount.create factory', function () {
            it('Will only create an OfferPercentageAmount containing an integer between 1 & 100 (inclusive)', function () {
                try {
                    OfferPercentageAmount.create();
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferPercentageAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferPercentageAmount.create('1');
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferPercentageAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferPercentageAmount.create(-1);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferPercentageAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferPercentageAmount.create(200);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferPercentageAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferPercentageAmount.create(3.14);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferPercentageAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                OfferPercentageAmount.create(69); // nice
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferPercentageAmount.create(42);

            assert(typeof cadence.value === 'number');
        });
    });

    describe('OfferFixedAmount', function () {
        describe('OfferFixedAmount.create factory', function () {
            it('Will only create an OfferFixedAmount containing an integer greater than 0', function () {
                try {
                    OfferFixedAmount.create();
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferFixedAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferFixedAmount.create('1');
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferFixedAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferFixedAmount.create(-1);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferFixedAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferFixedAmount.create(3.14);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferFixedAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                OfferFixedAmount.create(200);
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferFixedAmount.create(42);

            assert(typeof cadence.value === 'number');
        });
    });

    describe('OfferTrialAmount', function () {
        describe('OfferTrialAmount.create factory', function () {
            it('Will only create an OfferTrialAmount containing an integer greater than 0', function () {
                try {
                    OfferTrialAmount.create();
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferTrialAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferTrialAmount.create('1');
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferTrialAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferTrialAmount.create(-1);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferTrialAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferTrialAmount.create(3.14);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferTrialAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                OfferTrialAmount.create(200);
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferTrialAmount.create(42);

            assert(typeof cadence.value === 'number');
        });
    });

    describe('OfferFreeMonthsAmount', function () {
        describe('OfferFreeMonthsAmount.create factory', function () {
            it('Will only create an OfferFreeMonthsAmount containing an integer greater than 0', function () {
                try {
                    OfferFreeMonthsAmount.create();
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferFreeMonthsAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferFreeMonthsAmount.create('1');
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferFreeMonthsAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferFreeMonthsAmount.create(0);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferFreeMonthsAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferFreeMonthsAmount.create(-1);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferFreeMonthsAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                try {
                    OfferFreeMonthsAmount.create(3.14);
                    assert.fail();
                } catch (err) {
                    assert(err instanceof OfferFreeMonthsAmount.InvalidOfferAmount, 'expected an InvalidOfferAmount error');
                }

                OfferFreeMonthsAmount.create(1);
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferFreeMonthsAmount.create(2);

            assert.equal(typeof cadence.value, 'number');
        });
    });
});
