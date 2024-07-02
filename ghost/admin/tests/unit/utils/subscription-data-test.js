import moment from 'moment-timezone';
import {compExpiry, getSubscriptionData, isActive, isCanceled, isComplimentary, isSetToCancel, trialUntil, validUntil, validityDetails} from 'ghost-admin/utils/subscription-data';
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

    describe('validityDetails', function () {
        it('returns "Expires {compExpiry}" for expired complimentary subscriptions', function () {
            let data = {
                isComplimentary: true,
                compExpiry: '31 May 2021'
            };
            expect(validityDetails(data)).to.equal('Expires 31 May 2021');
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
                validityDetails: 'Ends 31 May 2222'
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
                validityDetails: 'Ended '
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
                validityDetails: 'Has access until 31 May 2021'
            });
        });

        it('returns the correct data for a complimentary subscription', function () {
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
                    amount: 0
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
                validityDetails: 'Expires 31 May 2021'
            });
        });
    });
});
