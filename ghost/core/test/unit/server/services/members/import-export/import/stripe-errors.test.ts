import assert from 'node:assert/strict';
import {attributingStripeRejections} from '../../../../../../../core/server/services/members/import-export/import/stripe-errors';

const errors = require('@tryghost/errors');

// Stripe's error classes set `type` to their own name. These stand in for the real ones,
// which need a live client to construct.
const stripeError = (type: string, message: string) => Object.assign(new Error(message), {type});

describe('members import stripe error attribution', function () {
    it('reads a rejected request as the row a publisher can fix', async function () {
        await assert.rejects(
            () => attributingStripeRejections(async () => {
                throw stripeError('StripeInvalidRequestError', 'No such customer: cus_missing');
            }),
            (error: Error) => {
                assert.equal(errors.utils.isGhostError(error), true);
                // The message survives, because the error report humanises this exact text.
                assert.match(error.message, /No such customer: cus_missing/);
                return true;
            }
        );
    });

    it('reads a declined card the same way', async function () {
        await assert.rejects(
            () => attributingStripeRejections(async () => {
                throw stripeError('StripeCardError', 'Your card was declined.');
            }),
            (error: Error) => errors.utils.isGhostError(error)
        );
    });

    it('leaves an unreachable Stripe as ours', async function () {
        await assert.rejects(
            () => attributingStripeRejections(async () => {
                throw stripeError('StripeConnectionError', 'An error occurred with our connection to Stripe.');
            }),
            (error: Error) => {
                assert.equal(errors.utils.isGhostError(error), false);
                return true;
            }
        );
    });

    it('leaves everything else alone', async function () {
        await assert.rejects(
            () => attributingStripeRejections(async () => {
                throw new TypeError('Cannot read properties of undefined');
            }),
            TypeError
        );
        await assert.rejects(
            () => attributingStripeRejections(async () => {
                throw stripeError('StripeAPIError', 'Stripe is down');
            }),
            (error: Error) => !errors.utils.isGhostError(error)
        );
    });

    it('returns what the work returned when nothing fails', async function () {
        assert.equal(await attributingStripeRejections(async () => 'cus_1'), 'cus_1');
    });
});
