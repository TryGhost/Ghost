import {describe, expect, it} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useMembersFilterConfig} from '@src/views/members/hooks/use-members-filter-config';

describe('useMembersFilterConfig', () => {
    it('exposes include and exclude operators for the label filter', () => {
        const {result} = renderHook(() => useMembersFilterConfig({
            labelsOptions: [
                {value: 'vip', label: 'VIP'}
            ]
        }));

        const labelField = result.current
            .flatMap(group => group.fields)
            .find(field => field.key === 'label');

        expect(labelField?.operators).toEqual([
            {value: 'is_any_of', label: 'is any of'},
            {value: 'is_not_any_of', label: 'is none of'}
        ]);
    });

    it('configures membership tier as a multi-value ember-compatible match filter', () => {
        const {result} = renderHook(() => useMembersFilterConfig({
            paidMembersEnabled: true,
            hasMultipleTiers: true,
            tiersOptions: [
                {value: 'tier_basic', label: 'Basic'},
                {value: 'tier_pro', label: 'Pro'}
            ]
        }));

        const tierField = result.current
            .flatMap(group => group.fields)
            .find(field => field.key === 'tier_id');

        expect(tierField?.type).toBe('multiselect');
        expect(tierField?.operators).toEqual([
            {value: 'is', label: 'is'},
            {value: 'is-not', label: 'is not'}
        ]);
    });

    it('configures offers as a multi-value ember-compatible match filter', () => {
        const {result} = renderHook(() => useMembersFilterConfig({
            paidMembersEnabled: true,
            hasOffers: true,
            offersOptions: [
                {value: 'offer_basic', label: 'Basic offer'}
            ]
        }));

        const offerField = result.current
            .flatMap(group => group.fields)
            .find(field => field.key === 'offer_redemptions');

        expect(offerField?.type).toBe('multiselect');
        expect(offerField?.operators).toEqual([
            {value: 'is', label: 'is'},
            {value: 'is-not', label: 'is not'}
        ]);
        expect(offerField?.hideOperatorSelect).not.toBe(true);
    });

    it('marks resource select filters as repeatable when multi-select is not the right model', () => {
        const {result} = renderHook(() => useMembersFilterConfig({
            membersTrackSources: true,
            paidMembersEnabled: true,
            emailAnalyticsEnabled: true,
            emailTrackOpens: true,
            emailTrackClicks: true,
            postResourceOptions: [
                {value: 'post_1', label: 'Post 1'}
            ],
            emailResourceOptions: [
                {value: 'email_1', label: 'Email 1'}
            ]
        }));

        const fields = result.current.flatMap(group => group.fields);
        const repeatableKeys = ['signup', 'conversion', 'emails.post_id', 'opened_emails.post_id', 'clicked_links.post_id'];

        for (const key of repeatableKeys) {
            const field = fields.find(currentField => currentField.key === key) as typeof fields[number] & {allowDuplicate?: boolean};

            expect(field?.allowDuplicate).toBe(true);
        }
    });
});
