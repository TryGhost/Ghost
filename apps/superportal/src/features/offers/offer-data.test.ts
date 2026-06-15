import {describe, it, expect} from 'vitest';
import {decideOfferRoute} from './offer-data';
import type {Offer} from '../../shared/api-client';
import type {MemberState} from '../../types';

function offer(overrides: Partial<Offer> = {}): Offer {
    return {
        id: 'o1',
        name: 'Deal',
        code: 'deal',
        display_title: 'Deal',
        display_description: '',
        type: 'percent',
        cadence: 'year',
        amount: 10,
        duration: 'once',
        currency: 'usd',
        status: 'active',
        redemption_type: 'signup',
        tier: {id: 't1', name: 'Silver'},
        ...overrides
    };
}

function member(status: MemberState['status']): MemberState {
    return {id: 'm1', uuid: 'm1', email: 'a@b.c', status};
}

describe('decideOfferRoute', () => {
    it('skips for paid members regardless of portal_button', () => {
        expect(decideOfferRoute({member: member('paid'), portalButton: true, offer: offer()})).toBe('skip');
        expect(decideOfferRoute({member: member('paid'), portalButton: false, offer: offer()})).toBe('skip');
    });

    it('lets comped members through', () => {
        expect(decideOfferRoute({member: member('comped'), portalButton: true, offer: offer()})).toBe('modal');
    });

    it('skips missing, archived, retention, and tierless offers', () => {
        expect(decideOfferRoute({member: null, portalButton: true, offer: null})).toBe('skip');
        expect(decideOfferRoute({member: null, portalButton: true, offer: offer({status: 'archived'})})).toBe('skip');
        expect(decideOfferRoute({member: null, portalButton: true, offer: offer({redemption_type: 'retention'})})).toBe('skip');
        expect(decideOfferRoute({member: null, portalButton: true, offer: offer({tier: undefined})})).toBe('skip');
    });

    it('goes straight to checkout when portal_button is false', () => {
        expect(decideOfferRoute({member: null, portalButton: false, offer: offer()})).toBe('checkout');
        expect(decideOfferRoute({member: member('free'), portalButton: false, offer: offer()})).toBe('checkout');
    });

    it('shows the modal when portal_button is on or unset', () => {
        expect(decideOfferRoute({member: null, portalButton: true, offer: offer()})).toBe('modal');
        expect(decideOfferRoute({member: member('free'), portalButton: undefined, offer: offer()})).toBe('modal');
    });
});
