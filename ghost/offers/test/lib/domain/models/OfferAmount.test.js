const {OfferPercentageAmount, OfferFixedAmount, OfferTrialAmount} = require('../../../../lib/domain/models/OfferAmount');

describe('OfferAmount', function () {
    describe('OfferPercentageAmount', function () {
        describe('OfferPercentageAmount.create factory', function () {
            it('Will only create an OfferPercentageAmount containing an integer between 1 & 100 (inclusive)', function () {
                try {
                    OfferPercentageAmount.create();
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferPercentageAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferPercentageAmount.create('1');
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferPercentageAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferPercentageAmount.create(-1);
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferPercentageAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferPercentageAmount.create(200);
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferPercentageAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferPercentageAmount.create(3.14);
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferPercentageAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                OfferPercentageAmount.create(69); // nice
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferPercentageAmount.create(42);

            should.ok(typeof cadence.value === 'number');
        });
    });

    describe('OfferFixedAmount', function () {
        describe('OfferFixedAmount.create factory', function () {
            it('Will only create an OfferFixedAmount containing an integer greater than 0', function () {
                try {
                    OfferFixedAmount.create();
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferFixedAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferFixedAmount.create('1');
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferFixedAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferFixedAmount.create(-1);
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferFixedAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferFixedAmount.create(3.14);
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferFixedAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                OfferFixedAmount.create(200);
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferFixedAmount.create(42);

            should.ok(typeof cadence.value === 'number');
        });
    });

    describe('OfferTrialAmount', function () {
        describe('OfferTrialAmount.create factory', function () {
            it('Will only create an OfferTrialAmount containing an integer greater than 0', function () {
                try {
                    OfferTrialAmount.create();
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferTrialAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferTrialAmount.create('1');
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferTrialAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferTrialAmount.create(-1);
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferTrialAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                try {
                    OfferTrialAmount.create(3.14);
                    should.fail();
                } catch (err) {
                    should.ok(
                        err instanceof OfferTrialAmount.InvalidOfferAmount,
                        'expected an InvalidOfferAmount error'
                    );
                }

                OfferTrialAmount.create(200);
            });
        });

        it('Exposes a number on the value property', function () {
            const cadence = OfferTrialAmount.create(42);

            should.ok(typeof cadence.value === 'number');
        });
    });
});
