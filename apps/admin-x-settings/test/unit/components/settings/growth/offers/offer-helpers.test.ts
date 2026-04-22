import * as assert from 'assert/strict';
import {MAX_RETENTION_OFFER_NAME_LENGTH, generateRetentionOfferName} from '@src/components/settings/growth/offers/offer-helpers';

describe('generateRetentionOfferName', function () {
    it('keeps the full 8-character hash when the preferred wording fits', function () {
        const name = generateRetentionOfferName({
            amount: 35,
            duration: 'forever',
            durationInMonths: 0
        }, 'deadbeef');

        assert.equal(name, 'Retention 35% off forever (deadbeef)');
    });

    it('handles once offers', function () {
        const name = generateRetentionOfferName({
            amount: 10,
            duration: 'once',
            durationInMonths: 0
        }, 'deadbeef');

        assert.equal(name, 'Retention 10% off once (deadbeef)');
    });

    it('handles repeating offers', function () {
        const name = generateRetentionOfferName({
            amount: 25,
            duration: 'repeating',
            durationInMonths: 2
        }, 'deadbeef');

        assert.equal(name, 'Retention 25% off for 2 mo (deadbeef)');
    });

    it('handles free months offers', function () {
        const name = generateRetentionOfferName({
            amount: 100,
            duration: 'repeating',
            durationInMonths: 3
        }, 'deadbeef');

        assert.equal(name, 'Retention 3 months free (deadbeef)');
    });

    it('keeps the full hash at the maximum validated month count', function () {
        const name = generateRetentionOfferName({
            amount: 99,
            duration: 'repeating',
            durationInMonths: 99
        }, 'deadbeef');

        assert.equal(name, 'Retention 99% off for 99 mo (deadbeef)');
        assert.equal(name.length <= MAX_RETENTION_OFFER_NAME_LENGTH, true);
        assert.equal(name.endsWith('(deadbeef)'), true);
    });

    it('truncates the hash when the full name would exceed 40 characters', function () {
        const name = generateRetentionOfferName({
            amount: 99,
            duration: 'repeating',
            durationInMonths: 99
        }, 'deadbeefcafebabe');

        assert.equal(name, 'Retention 99% off for 99 mo (deadbeefca)');
        assert.equal(name.length, MAX_RETENTION_OFFER_NAME_LENGTH);
    });
});
