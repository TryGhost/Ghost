import {
    buildOfferOptions,
    fromOfferFilterDisplayValues,
    toOfferFilterDisplayValues,
    useMemberFilterFields
} from './use-member-filter-fields';
import {describe, expect, it, vi} from 'vitest';
import {memberFields} from './member-fields';
import {renderHook} from '@testing-library/react';

vi.mock('@tryghost/shade', () => ({
    LucideIcon: new Proxy({}, {
        get() {
            return () => null;
        }
    })
}));

vi.mock('@src/components/label-picker/label-filter-renderer', () => ({
    default: () => null
}));

describe('useMemberFilterFields', () => {
    it('hydrates grouped member fields from the local schema', () => {
        const {result} = renderHook(() => useMemberFilterFields({
            labelsOptions: [{value: 'vip', label: 'VIP'}],
            newsletters: [{slug: 'weekly', name: 'Weekly', status: 'active'}],
            paidMembersEnabled: true,
            emailFiltersEnabled: true,
            postResourceOptions: [{value: 'post_1', label: 'Welcome'}],
            onPostResourceSearchChange: vi.fn(),
            postResourceSearchValue: 'wel',
            postResourceLoading: false,
            emailResourceOptions: [{value: 'email_1', label: 'Launch'}],
            onEmailResourceSearchChange: vi.fn(),
            emailResourceSearchValue: 'lau',
            emailResourceLoading: false,
            offers: [{id: 'offer_1', name: 'Offer', redemption_type: 'signup', cadence: 'month'} as never],
            membersTrackSources: true,
            emailTrackOpens: true,
            emailTrackClicks: true,
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

    it('shows the Email group when email sending is enabled', () => {
        const {result} = renderHook(() => useMemberFilterFields({
            emailFiltersEnabled: true,
            siteTimezone: 'UTC'
        }));

        const emailGroup = result.current.find(group => group.group === 'Email');

        expect(emailGroup?.fields.map(field => field.key)).toEqual([
            'email_count',
            'email_opened_count',
            'emails.post_id',
            'newsletter_feedback'
        ]);
    });

    it('keeps the feedback filter visible without a separate feature flag', () => {
        const {result} = renderHook(() => useMemberFilterFields({
            emailFiltersEnabled: true,
            emailResourceOptions: [{value: 'email_1', label: 'Launch'}],
            onEmailResourceSearchChange: vi.fn(),
            emailResourceSearchValue: 'lau',
            emailResourceLoading: false,
            siteTimezone: 'UTC'
        }));

        const emailFields = result.current.find(group => group.group === 'Email')?.fields ?? [];
        const feedbackField = emailFields.find(field => field.key === 'newsletter_feedback');

        expect(feedbackField).toMatchObject({
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

    it('keeps hydrated newsletter filters visible when only one active newsletter remains', () => {
        const {result} = renderHook(() => useMemberFilterFields({
            newsletters: [{slug: 'weekly', name: 'Weekly', status: 'active'}],
            hydratedNewsletterSlugs: ['weekly'],
            siteTimezone: 'UTC'
        }));

        const allFields = result.current.flatMap(group => group.fields);
        const weeklyField = allFields.find(field => field.key === 'newsletters.weekly');

        expect(allFields.map(field => field.key)).toContain('newsletters.weekly');
        expect(weeklyField).toMatchObject({
            label: 'Weekly'
        });
    });

    it('keeps hydrated archived newsletter filters visible', () => {
        const {result} = renderHook(() => useMemberFilterFields({
            newsletters: [
                {slug: 'weekly', name: 'Weekly', status: 'archived'},
                {slug: 'product', name: 'Product', status: 'active'},
                {slug: 'daily', name: 'Daily', status: 'active'}
            ],
            hydratedNewsletterSlugs: ['weekly'],
            siteTimezone: 'UTC'
        }));

        const newsletterGroup = result.current.find(group => group.group === 'Newsletters');
        const weeklyField = newsletterGroup?.fields.find(field => field.key === 'newsletters.weekly');

        expect(newsletterGroup?.fields.map(field => field.key)).toContain('newsletters.weekly');
        expect(weeklyField).toMatchObject({
            label: 'Weekly'
        });
    });

    it('hydrates grouped retention offers on the offer field', () => {
        const {result} = renderHook(() => useMemberFilterFields({
            paidMembersEnabled: true,
            offers: [
                {id: 'offer_regular', name: 'Regular Offer', redemption_type: 'signup', cadence: 'month'},
                {id: 'offer_month_1', name: 'Retention A', redemption_type: 'retention', cadence: 'month'},
                {id: 'offer_month_2', name: 'Retention B', redemption_type: 'retention', cadence: 'month'},
                {id: 'offer_year_1', name: 'Retention C', redemption_type: 'retention', cadence: 'year'}
            ] as never,
            siteTimezone: 'UTC'
        }));

        const subscriptionFields = result.current.find(group => group.group === 'Subscription')?.fields ?? [];
        const offerField = subscriptionFields.find(field => field.key === 'offer_redemptions');

        expect(offerField?.options).toEqual([
            {value: 'offer_regular', label: 'Regular Offer'},
            {value: 'retention:month', label: 'Monthly Retention', metadata: {offerIds: ['offer_month_1', 'offer_month_2']}},
            {value: 'retention:year', label: 'Yearly Retention', metadata: {offerIds: ['offer_year_1']}}
        ]);
        expect(offerField?.customValueRenderer).toBeTypeOf('function');
    });

    it('renders direct retention offer ids with the fetched offer label', () => {
        const {result} = renderHook(() => useMemberFilterFields({
            paidMembersEnabled: true,
            offers: [
                {id: 'offer_month_1', name: 'Retention A', redemption_type: 'retention', cadence: 'month'}
            ] as never,
            siteTimezone: 'UTC'
        }));

        const subscriptionFields = result.current.find(group => group.group === 'Subscription')?.fields ?? [];
        const offerField = subscriptionFields.find(field => field.key === 'offer_redemptions');

        expect(offerField?.customValueRenderer?.(['offer_month_1'], offerField.options || [])).toBe('Retention A');
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
        const options = buildOfferOptions(offers as never);

        expect(options).toEqual([
            {value: 'offer_regular', label: 'Regular Offer'},
            {value: 'retention:month', label: 'Monthly Retention', metadata: {offerIds: ['offer_month_1', 'offer_month_2']}},
            {value: 'retention:year', label: 'Yearly Retention', metadata: {offerIds: ['offer_year_1']}}
        ]);
    });

    it('maps offer filter values between stored ids and grouped UI tokens', () => {
        const options = buildOfferOptions(offers as never);

        expect(toOfferFilterDisplayValues(['offer_month_1', 'offer_month_2', 'offer_regular'], options)).toEqual([
            'retention:month',
            'offer_regular'
        ]);

        expect(toOfferFilterDisplayValues(['offer_month_1'], options)).toEqual(['offer_month_1']);

        expect(fromOfferFilterDisplayValues(['retention:month', 'offer_regular'], options)).toEqual([
            'offer_month_1',
            'offer_month_2',
            'offer_regular'
        ]);
    });
});
