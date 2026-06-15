import {describe, expect, it} from 'vitest';

import {availablePaidTiers} from './access';
import type {SiteState} from '../../types';

function makeSite(overrides: Partial<SiteState> = {}): SiteState {
    return {
        title: 'Blog',
        url: 'https://example.com/',
        locale: 'en',
        paid_members_enabled: true,
        tiers: [
            {id: 'visible', name: 'Visible', type: 'paid', visibility: 'public', monthly_price: 500, yearly_price: 5000},
            {id: 'hidden', name: 'Hidden', type: 'paid', visibility: 'none', monthly_price: 900, yearly_price: 9000}
        ],
        ...overrides
    };
}

describe('availablePaidTiers portal_products filter', () => {
    it('falls back to tier visibility without portal_products', () => {
        expect(availablePaidTiers(makeSite()).map(t => t.id)).toEqual(['visible']);
        expect(availablePaidTiers(makeSite({portal_products: null})).map(t => t.id)).toEqual(['visible']);
    });

    it('replaces the visibility check when portal_products is set', () => {
        const site = makeSite({portal_products: ['hidden']});

        expect(availablePaidTiers(site).map(t => t.id)).toEqual(['hidden']);
    });

    it('hides everything for an empty portal_products list', () => {
        expect(availablePaidTiers(makeSite({portal_products: []}))).toEqual([]);
    });
});
