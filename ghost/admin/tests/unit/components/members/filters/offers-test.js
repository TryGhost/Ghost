import {OFFERS_FILTER} from 'ghost-admin/components/members/filters/offers';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit: Component: members/filters/offers', function () {
    describe('OFFERS_FILTER.getColumnValue', function () {
        it('renders retention offers using cadence labels', function () {
            const member = {
                subscriptions: [{
                    offer_redemptions: [
                        {name: 'One month on us', redemption_type: 'retention', cadence: 'month'},
                        {name: 'Welcome discount', redemption_type: 'signup', cadence: 'month'},
                        {name: 'Two months on us', redemption_type: 'retention', cadence: 'year'}
                    ]
                }]
            };

            const value = OFFERS_FILTER.getColumnValue(member);

            expect(value.text).to.equal('Monthly Retention, Welcome discount, Yearly Retention');
        });

        it('returns empty text when offer_redemptions is missing', function () {
            const member = {
                subscriptions: [{}]
            };

            const value = OFFERS_FILTER.getColumnValue(member);

            expect(value.text).to.equal('');
        });
    });
});
