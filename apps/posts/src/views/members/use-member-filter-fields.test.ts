import {renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {
    buildOfferOptions,
    buildRetentionOfferIdMap,
    collapseRetentionOfferFilters,
    expandRetentionOfferFilters,
    useMemberFilterFields
} from './use-member-filter-fields';
import {memberFields} from './member-fields';
import type {Filter} from '@tryghost/shade';

describe('useMemberFilterFields', () => {
    it('hydrates grouped member fields from the local schema', () => {
        const {result} = renderHook(() => useMemberFilterFields({
            labelsOptions: [{value: 'vip', label: 'VIP'}],
            newsletters: [{slug: 'weekly', name: 'Weekly', status: 'active'}],
            paidMembersEnabled: true,
            emailAnalyticsEnabled: true,
            postResourceOptions: [{value: 'post_1', label: 'Welcome'}],
            onPostResourceSearchChange: vi.fn(),
            postResourceSearchValue: 'wel',
            postResourceLoading: false,
            emailResourceOptions: [{value: 'email_1', label: 'Launch'}],
            onEmailResourceSearchChange: vi.fn(),
            emailResourceSearchValue: 'lau',
            emailResourceLoading: false,
            hasOffers: true,
            offersOptions: [{value: 'offer_1', label: 'Offer'}],
            membersTrackSources: true,
            emailTrackOpens: true,
            emailTrackClicks: true,
            audienceFeedbackEnabled: true,
            siteTimezone: 'UTC'
        }));

        expect(result.current.map(group => group.group)).toEqual([
            'Basic',
            'Subscription',
            'Email'
        ]);

        const basicFields = result.current.find(group => group.group === 'Basic')?.fields ?? [];
        const emailFields = result.current.find(group => group.group === 'Email')?.fields ?? [];
        const labelField = basicFields.find(field => field.key === 'label');
        const signupField = basicFields.find(field => field.key === 'signup');
        const emailPostField = emailFields.find(field => field.key === 'emails.post_id');

        expect(labelField?.operators?.map(operator => operator.value)).toEqual(memberFields.label.operators);
        expect(labelField?.options).toEqual([{value: 'vip', label: 'VIP'}]);
        expect(labelField?.customRenderer).toBeTypeOf('function');

        expect(signupField).toMatchObject({
            options: [{value: 'post_1', label: 'Welcome'}],
            searchValue: 'wel',
            isLoading: false
        });

        expect(emailPostField).toMatchObject({
            options: [{value: 'email_1', label: 'Launch'}],
            searchValue: 'lau',
            isLoading: false
        });
    });

    it('hydrates newsletter pattern fields with runtime labels', () => {
        const {result} = renderHook(() => useMemberFilterFields({
            newsletters: [
                {slug: 'weekly', name: 'Weekly', status: 'active'},
                {slug: 'product', name: 'Product', status: 'active'}
            ],
            siteTimezone: 'UTC'
        }));

        const newsletterGroup = result.current.find(group => group.group === 'Newsletters');

        expect(newsletterGroup?.fields.map(field => field.key)).toEqual([
            'subscribed',
            'newsletters.weekly',
            'newsletters.product'
        ]);

        expect(newsletterGroup?.fields[1]).toMatchObject({
            label: 'Weekly'
        });
    });
});

describe('retention offer helpers', () => {
    const offers = [
        {id: 'offer_regular', name: 'Regular Offer', redemption_type: 'signup', cadence: 'month'},
        {id: 'offer_month_1', name: 'Retention A', redemption_type: 'retention', cadence: 'month'},
        {id: 'offer_month_2', name: 'Retention B', redemption_type: 'retention', cadence: 'month'},
        {id: 'offer_year_1', name: 'Retention C', redemption_type: 'retention', cadence: 'year'}
    ] as const;

    it('builds grouped retention offer options', () => {
        const retentionMap = buildRetentionOfferIdMap(offers as never);
        const options = buildOfferOptions(offers as never, true, retentionMap);

        expect(options).toEqual([
            {value: 'offer_regular', label: 'Regular Offer'},
            {value: 'retention:month', label: 'Monthly Retention'},
            {value: 'retention:year', label: 'Yearly Retention'}
        ]);
    });

    it('collapses and expands grouped retention offer filters', () => {
        const retentionMap = buildRetentionOfferIdMap(offers as never);
        const collapsed = collapseRetentionOfferFilters([
            {
                id: '1',
                field: 'offer_redemptions',
                operator: 'is-any',
                values: ['offer_month_1', 'offer_month_2', 'offer_regular']
            }
        ] as Filter[], retentionMap);

        expect(collapsed[0].values).toEqual(['retention:month', 'offer_regular']);

        const expanded = expandRetentionOfferFilters([
            {
                id: '1',
                field: 'offer_redemptions',
                operator: 'is-any',
                values: ['retention:month', 'offer_regular']
            }
        ] as Filter[], retentionMap);

        expect(expanded[0].values).toEqual(['offer_month_1', 'offer_month_2', 'offer_regular']);
    });
});
