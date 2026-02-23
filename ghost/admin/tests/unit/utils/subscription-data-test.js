import moment from 'moment-timezone';
import {compExpiry, getDiscountPrice, getOfferDisplayData, getSubscriptionData, isActive, isCanceled, isComplimentary, isSetToCancel, priceLabel, trialUntil, validUntil, validityDetails} from 'ghost-admin/utils/subscription-data';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit: Util: subscription-data', function () {
    describe('validUntil', function () {
        it('returns the end of the current billing period when the subscription is canceled at the end of the period', function () {
            let sub = {
                status: 'canceled',
                cancel_at_period_end: true,
                current_period_end: '2021-05-31'
            };
            expect(validUntil(sub)).to.equal('31 May 2021');
        });

        it('returns an empty string when the subscription is canceled immediately', function () {
            let sub = {
                status: 'canceled',
                cancel_at_period_end: false,
                current_period_end: '2021-05-31'
            };
            expect(validUntil(sub)).to.equal('');
        });

        it('returns the end of the current billing period when the subscription is active', function () {
            let sub = {
                status: 'active',
                cancel_at_period_end: false,
                current_period_end: '2021-05-31'
            };
            expect(validUntil(sub)).to.equal('31 May 2021');
        });

        it('returns the end of the current billing period when the subscription is in trial', function () {
            let sub = {
                status: 'trialing',
                cancel_at_period_end: false,
                current_period_end: '2021-05-31'
            };
            expect(validUntil(sub)).to.equal('31 May 2021');
        });

        it('returns the end of the current billing period when the subscription is past_due', function () {
            let sub = {
                status: 'past_due',
                cancel_at_period_end: false,
                current_period_end: '2021-05-31'
            };
            expect(validUntil(sub)).to.equal('31 May 2021');
        });

        it('returns the end of the current billing period when the subscription is unpaid', function () {
            let sub = {
                status: 'unpaid',
                cancel_at_period_end: false,
                current_period_end: '2021-05-31'
            };
            expect(validUntil(sub)).to.equal('31 May 2021');
        });

        // Extra data safety check, mainly for imported subscriptions
        it('returns an empty string if the subcription is canceled immediately and has no current_period_start', function () {
            let sub = {
                status: 'canceled',
                cancel_at_period_end: false
            };
            expect(validUntil(sub)).to.equal('');
        });

        // Extra data safety check, mainly for imported subscriptions
        it('returns an empty string if the subscription has no current_period_end', function () {
            let sub = {
                status: 'active',
                cancel_at_period_end: false
            };
            expect(validUntil(sub)).to.equal('');
        });
    });

    describe('isActive', function () {
        it('returns true for active subscriptions', function () {
            let sub = {status: 'active'};
            expect(isActive(sub)).to.be.true;
        });

        it('returns true for trialing subscriptions', function () {
            let sub = {status: 'trialing'};
            expect(isActive(sub)).to.be.true;
        });

        it('returns true for past_due subscriptions', function () {
            let sub = {status: 'past_due'};
            expect(isActive(sub)).to.be.true;
        });

        it('returns true for unpaid subscriptions', function () {
            let sub = {status: 'unpaid'};
            expect(isActive(sub)).to.be.true;
        });

        it('returns false for canceled subscriptions', function () {
            let sub = {status: 'canceled'};
            expect(isActive(sub)).to.be.false;
        });
    });

    describe('isComplimentary', function () {
        it('returns true for complimentary subscriptions', function () {
            let sub = {id: null};
            expect(isComplimentary(sub)).to.be.true;
        });

        it('returns false for paid subscriptions', function () {
            let sub = {id: 'sub_123'};
            expect(isComplimentary(sub)).to.be.false;
        });
    });

    describe('isCanceled', function () {
        it('returns true for canceled subscriptions', function () {
            let sub = {status: 'canceled'};
            expect(isCanceled(sub)).to.be.true;
        });

        it('returns false for active subscriptions', function () {
            let sub = {status: 'active'};
            expect(isCanceled(sub)).to.be.false;
        });
    });

    describe('isSetToCancel', function () {
        it('returns true for subscriptions set to cancel at the end of the period', function () {
            let sub = {status: 'active', cancel_at_period_end: true};
            expect(isSetToCancel(sub)).to.be.true;
        });

        it('returns false for canceled subscriptions', function () {
            let sub = {status: 'canceled', cancel_at_period_end: true};
            expect(isSetToCancel(sub)).to.be.false;
        });
    });

    describe('trialUntil', function () {
        it('returns the trial end date for subscriptions in trial', function () {
            let sub = {status: 'trialing', trial_end_at: '2222-05-31'};
            expect(trialUntil(sub)).to.equal('31 May 2222');
        });

        it('returns the trial end date for trial offers', function () {
            let sub = {status: 'active', trial_end_at: '2222-05-31', offer: {type: 'trial'}};
            expect(trialUntil(sub)).to.equal('31 May 2222');
        });

        it('returns undefined for free_months offers', function () {
            let sub = {status: 'active', trial_end_at: '2222-05-31', offer: {type: 'free_months'}};
            expect(trialUntil(sub)).to.be.undefined;
        });

        it('returns undefined for subscriptions not in trial', function () {
            let sub = {status: 'active'};
            expect(trialUntil(sub)).to.be.undefined;
        });
    });

    describe('compExpiry', function () {
        it('returns the complimentary expiry date for complimentary subscriptions', function () {
            let sub = {id: null, tier: {expiry_at: moment.utc('2021-05-31').toISOString()}};
            expect(compExpiry(sub)).to.equal('31 May 2021');
        });

        it('returns undefined for paid subscriptions', function () {
            let sub = {id: 'sub_123'};
            expect(compExpiry(sub)).to.be.undefined;
        });
    });

    describe('priceLabel', function () {
        it('returns "Free trial" for trial subscriptions', function () {
            let data = {trialUntil: '31 May 2021'};
            expect(priceLabel(data)).to.equal('Free trial');
        });

        it('returns nothing if the price nickname is the default "monthly" or "yearly"', function () {
            let data = {price: {nickname: 'Monthly'}};
            expect(priceLabel(data)).to.be.undefined;

            data = {price: {nickname: 'Yearly'}};
            expect(priceLabel(data)).to.be.undefined;
        });

        it('returns the price nickname for non-default prices', function () {
            let data = {price: {nickname: 'Custom'}};
            expect(priceLabel(data)).to.equal('Custom');
        });
    });

    describe('validityDetails', function () {
        it('returns "Expires {compExpiry}" for expired complimentary subscriptions', function () {
            let data = {
                isComplimentary: true,
                compExpiry: '31 May 2021'
            };
            expect(validityDetails(data)).to.equal('Expires 31 May 2021');
        });

        it('returns "" for forever complimentary subscriptions', function () {
            let data = {
                isComplimentary: true,
                compExpiry: undefined
            };
            expect(validityDetails(data)).to.equal('');
        });

        it('returns "Ended {validUntil}" for canceled subscriptions', function () {
            let data = {
                hasEnded: true,
                validUntil: '31 May 2021'
            };
            expect(validityDetails(data)).to.equal('Ended 31 May 2021');
        });

        it('returns "Has access until {validUntil}" for set to cancel subscriptions', function () {
            let data = {
                willEndSoon: true,
                validUntil: '31 May 2021'
            };
            expect(validityDetails(data)).to.equal('Has access until 31 May 2021');
        });

        it('returns "Ends {validUntil}" for trial subscriptions', function () {
            let data = {
                trialUntil: '31 May 2021'
            };
            expect(validityDetails(data)).to.equal('Ends 31 May 2021');
        });

        it('returns "Renews {validUntil}" for active subscriptions', function () {
            let data = {
                validUntil: '31 May 2021'
            };
            expect(validityDetails(data)).to.equal('Renews 31 May 2021');
        });
    });

    describe('getSubscriptionData', function () {
        it('returns the correct data for an active subscription', function () {
            let sub = {
                id: 'defined',
                status: 'active',
                cancel_at_period_end: false,
                current_period_end: '2021-05-31',
                trial_end_at: null,
                tier: null,
                price: {
                    currency: 'usd',
                    amount: 5000
                }
            };
            let data = getSubscriptionData(sub);

            expect(data).to.include({
                isComplimentary: false,
                compExpiry: undefined,
                hasEnded: false,
                validUntil: '31 May 2021',
                willEndSoon: false,
                trialUntil: undefined,
                priceLabel: undefined,
                validityDetails: 'Renews 31 May 2021'
            });
        });

        it('returns the correct data for a trial subscription', function () {
            let sub = {
                id: 'defined',
                status: 'trialing',
                cancel_at_period_end: false,
                current_period_end: '2222-05-31',
                trial_end_at: '2222-05-31',
                tier: null,
                price: {
                    currency: 'usd',
                    amount: 5000
                }
            };
            let data = getSubscriptionData(sub);

            expect(data).to.include({
                isComplimentary: false,
                compExpiry: undefined,
                hasEnded: false,
                validUntil: '31 May 2222',
                willEndSoon: false,
                trialUntil: '31 May 2222',
                priceLabel: 'Free trial',
                validityDetails: ' – Ends 31 May 2222'
            });
        });

        it('returns renews details for free_months offers', function () {
            let sub = {
                id: 'defined',
                status: 'active',
                cancel_at_period_end: false,
                current_period_end: '2222-05-31',
                trial_end_at: '2222-05-31',
                offer: {
                    type: 'free_months'
                },
                tier: null,
                price: {
                    currency: 'usd',
                    amount: 5000,
                    nickname: 'Free tier'
                }
            };
            let data = getSubscriptionData(sub);

            expect(data).to.include({
                isComplimentary: false,
                compExpiry: undefined,
                hasEnded: false,
                validUntil: '31 May 2222',
                willEndSoon: false,
                trialUntil: undefined,
                priceLabel: 'Free tier',
                validityDetails: ' – Renews 31 May 2222'
            });
        });

        it('returns the correct data for an immediately canceled subscription', function () {
            let sub = {
                id: 'defined',
                status: 'canceled',
                cancel_at_period_end: false,
                current_period_end: '2021-05-31',
                trial_end_at: null,
                tier: null,
                price: {
                    currency: 'usd',
                    amount: 5000
                }
            };
            let data = getSubscriptionData(sub);

            expect(data).to.include({
                isComplimentary: false,
                compExpiry: undefined,
                hasEnded: true,
                validUntil: '',
                willEndSoon: false,
                trialUntil: undefined,
                priceLabel: undefined,
                validityDetails: 'Ended'
            });
        });

        it('returns the correct data for a subscription set to cancel at the end of the period', function () {
            let sub = {
                id: 'defined',
                status: 'active',
                cancel_at_period_end: true,
                current_period_end: '2021-05-31',
                trial_end_at: null,
                tier: null,
                price: {
                    currency: 'usd',
                    amount: 5000
                }
            };
            let data = getSubscriptionData(sub);

            expect(data).to.include({
                isComplimentary: false,
                compExpiry: undefined,
                hasEnded: false,
                validUntil: '31 May 2021',
                willEndSoon: true,
                trialUntil: undefined,
                priceLabel: undefined,
                validityDetails: 'Has access until 31 May 2021'
            });
        });

        it('returns the correct data for a complimentary subscription active forever', function () {
            let sub = {
                id: null,
                status: 'active',
                cancel_at_period_end: false,
                current_period_end: '2021-05-31',
                trial_end_at: null,
                tier: {
                    expiry_at: null
                },
                price: {
                    currency: 'usd',
                    amount: 0,
                    nickname: 'Complimentary'
                }
            };
            let data = getSubscriptionData(sub);

            expect(data).to.include({
                isComplimentary: true,
                compExpiry: undefined,
                hasEnded: false,
                validUntil: '31 May 2021',
                willEndSoon: false,
                trialUntil: undefined,
                priceLabel: 'Complimentary',
                validityDetails: ''
            });
        });

        it('returns the correct data for a complimentary subscription with an expiration date', function () {
            let sub = {
                id: null,
                status: 'active',
                cancel_at_period_end: false,
                current_period_end: '2021-05-31',
                trial_end_at: null,
                tier: {
                    expiry_at: moment.utc('2021-05-31').toISOString()
                },
                price: {
                    currency: 'usd',
                    amount: 0,
                    nickname: 'Complimentary'
                }
            };
            let data = getSubscriptionData(sub);

            expect(data).to.include({
                isComplimentary: true,
                compExpiry: '31 May 2021',
                hasEnded: false,
                validUntil: '31 May 2021',
                willEndSoon: false,
                trialUntil: undefined,
                priceLabel: 'Complimentary',
                validityDetails: ' – Expires 31 May 2021'
            });
        });

        it('sets hasActiveDiscount with discounted and original prices', function () {
            const sub = {
                id: 'sub_1',
                status: 'active',
                cancel_at_period_end: false,
                current_period_end: '2026-05-31',
                price: {currency: 'usd', amount: 5000},
                next_payment: {
                    amount: 2500,
                    original_amount: 5000,
                    currency: 'usd',
                    discount: {offer_id: 'offer_1', end: '2026-09-01'}
                }
            };

            const data = getSubscriptionData(sub);

            expect(data.hasActiveDiscount).to.be.true;
            expect(data.discountedPrice).to.deep.equal({currencySymbol: '$', nonDecimalAmount: 25});
            expect(data.originalPrice).to.deep.equal({currencySymbol: '$', nonDecimalAmount: 50});
        });

        it('does not set hasActiveDiscount when no discount', function () {
            const sub = {
                id: 'sub_1',
                status: 'active',
                cancel_at_period_end: false,
                current_period_end: '2026-05-31',
                price: {currency: 'usd', amount: 5000}
            };

            const data = getSubscriptionData(sub);

            expect(data.hasActiveDiscount).to.be.undefined;
        });
    });

    describe('getOfferDisplayData', function () {
        const cases = [
            {
                name: 'signup + percent',
                offer: {redemption_type: 'signup', type: 'percent', name: 'Black Friday', amount: 30},
                expected: {label: 'Signup offer', detail: 'Black Friday (30% off)'}
            },
            {
                name: 'signup + fixed (USD)',
                offer: {redemption_type: 'signup', type: 'fixed', name: 'Welcome Deal', amount: 500, currency: 'USD'},
                expected: {label: 'Signup offer', detail: 'Welcome Deal ($5 off)'}
            },
            {
                name: 'signup + fixed (EUR)',
                offer: {redemption_type: 'signup', type: 'fixed', name: 'Euro Deal', amount: 1000, currency: 'EUR'},
                expected: {label: 'Signup offer', detail: 'Euro Deal (€10 off)'}
            },
            {
                name: 'signup + trial',
                offer: {redemption_type: 'signup', type: 'trial', name: 'Try It', amount: 7},
                expected: {label: 'Signup offer', detail: 'Try It (7 days free)'}
            },
            {
                name: 'retention + percent + once',
                offer: {redemption_type: 'retention', type: 'percent', amount: 50, duration: 'once'},
                expected: {label: 'Retention offer', detail: '50% off'}
            },
            {
                name: 'retention + percent + repeating (no discount end)',
                offer: {redemption_type: 'retention', type: 'percent', amount: 50, duration: 'repeating', duration_in_months: 3},
                expected: {label: 'Retention offer', detail: '50% off for 3 months'}
            },
            {
                name: 'retention + percent + repeating (1 month, no discount end)',
                offer: {redemption_type: 'retention', type: 'percent', amount: 50, duration: 'repeating', duration_in_months: 1},
                expected: {label: 'Retention offer', detail: '50% off for 1 month'}
            },
            {
                name: 'retention + percent + repeating (with discount end)',
                offer: {id: 'offer_1', redemption_type: 'retention', type: 'percent', amount: 50, duration: 'repeating', duration_in_months: 3},
                sub: {next_payment: {discount: {offer_id: 'offer_1', end: '2026-02-17T00:00:00.000Z'}}},
                expected: {label: 'Retention offer', detail: '50% off until Feb 2026'}
            },
            {
                name: 'retention + percent + forever',
                offer: {redemption_type: 'retention', type: 'percent', amount: 25, duration: 'forever'},
                expected: {label: 'Retention offer', detail: '25% off forever'}
            },
            {
                name: 'retention + free_months (no discount end)',
                offer: {redemption_type: 'retention', type: 'free_months', amount: 1, duration: 'free_months'},
                expected: {label: 'Retention offer', detail: '1 month free'}
            },
            {
                name: 'retention + free_months (with discount end)',
                offer: {id: 'offer_2', redemption_type: 'retention', type: 'free_months', amount: 1, duration: 'free_months'},
                sub: {next_payment: {discount: {offer_id: 'offer_2', end: '2026-02-17T00:00:00.000Z'}}},
                expected: {label: 'Retention offer', detail: '1 month free until Feb 2026'}
            },
            {
                name: 'retention + discount end does not match offer id',
                offer: {id: 'offer_1', redemption_type: 'retention', type: 'percent', amount: 50, duration: 'repeating', duration_in_months: 3},
                sub: {next_payment: {discount: {offer_id: 'offer_other', end: '2026-02-17T00:00:00.000Z'}}},
                expected: {label: 'Retention offer', detail: '50% off for 3 months'}
            },
            {
                name: 'missing redemption_type defaults to signup label',
                offer: {type: 'percent', name: 'Legacy Offer', amount: 15},
                expected: {label: 'Signup offer', detail: 'Legacy Offer (15% off)'}
            }
        ];

        cases.forEach(({name, offer, sub, expected}) => {
            it(name, function () {
                const result = getOfferDisplayData(offer, sub);
                expect(result).to.deep.equal(expected);
            });
        });
    });

    describe('getDiscountPrice', function () {
        it('returns null when there is no next_payment', function () {
            expect(getDiscountPrice({price: {currency: 'usd', amount: 5000}})).to.be.null;
        });

        it('returns null when there is no discount on next_payment', function () {
            expect(getDiscountPrice({
                price: {currency: 'usd', amount: 5000},
                next_payment: {amount: 5000, original_amount: 5000, currency: 'usd'}
            })).to.be.null;
        });

        it('returns null when discounted amount equals original amount', function () {
            expect(getDiscountPrice({
                price: {currency: 'usd', amount: 5000},
                next_payment: {
                    amount: 5000,
                    original_amount: 5000,
                    currency: 'usd',
                    discount: {offer_id: 'offer_1', end: '2026-09-01'}
                }
            })).to.be.null;
        });

        it('returns discounted and original prices for USD', function () {
            const result = getDiscountPrice({
                price: {currency: 'usd', amount: 5000},
                next_payment: {
                    amount: 2500,
                    original_amount: 5000,
                    currency: 'usd',
                    discount: {offer_id: 'offer_1', end: '2026-09-01'}
                }
            });
            expect(result).to.deep.equal({
                discountedPrice: {currencySymbol: '$', nonDecimalAmount: 25},
                originalPrice: {currencySymbol: '$', nonDecimalAmount: 50}
            });
        });

        it('returns discounted and original prices for EUR', function () {
            const result = getDiscountPrice({
                price: {currency: 'eur', amount: 10000},
                next_payment: {
                    amount: 7000,
                    original_amount: 10000,
                    currency: 'eur',
                    discount: {offer_id: 'offer_1', end: '2026-09-01'}
                }
            });
            expect(result).to.deep.equal({
                discountedPrice: {currencySymbol: '€', nonDecimalAmount: 70},
                originalPrice: {currencySymbol: '€', nonDecimalAmount: 100}
            });
        });
    });
});
