import {describe, expect, it} from 'vitest';
import {humanizeRecipientFilter} from './humanize-recipient-filter';

// Ported from apps/ember-admin/app/helpers/humanize-recipient-filter.js.

describe('humanizeRecipientFilter', () => {
    it('names both statuses together as everyone', () => {
        expect(humanizeRecipientFilter('status:free,status:-free')).toBe('All subscribers');
    });

    it('names a single status', () => {
        expect(humanizeRecipientFilter('status:free')).toBe('Free subscribers');
        expect(humanizeRecipientFilter('status:-free')).toBe('Paid subscribers');
    });

    it('lists labels, capitalised', () => {
        expect(humanizeRecipientFilter('labels:[vip,founder]')).toBe('Labels: Vip, Founder');
    });

    it('uses the singular for one label', () => {
        expect(humanizeRecipientFilter('labels:[vip]')).toBe('Label: Vip');
        expect(humanizeRecipientFilter('label:vip')).toBe('Label: Vip');
    });

    it('lists products', () => {
        expect(humanizeRecipientFilter('products:[gold,silver]')).toBe('Products: Gold, Silver');
    });

    it('joins a status and a label with an ampersand', () => {
        expect(humanizeRecipientFilter('status:free,labels:[vip]'))
            .toBe('Free subscribers & Label: Vip');
    });

    // The helper only understands what the publishing UI can produce; showing
    // the raw filter beats guessing wrong.
    it('falls back to the raw filter for anything it does not understand', () => {
        expect(humanizeRecipientFilter('some:nonsense')).toBe('some:nonsense');
    });

    it('is empty for an empty filter', () => {
        expect(humanizeRecipientFilter('')).toBe('');
        expect(humanizeRecipientFilter()).toBe('');
    });
});
