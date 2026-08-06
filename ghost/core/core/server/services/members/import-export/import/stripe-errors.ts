const errors = require('@tryghost/errors');

// Stripe types its failures, and the type says whose problem it is: a rejected request
// names something wrong with the row, while a connection or API failure is the service
// being unreachable. A CSV commonly carries Stripe data on only some of its rows, so the
// two arrive interleaved and telling them apart by anything other than the type -- how
// many rows failed, whether any imported -- gets both wrong.
const ROW_LEVEL_STRIPE_ERRORS = new Set([
    'StripeInvalidRequestError',
    'StripeCardError'
]);

// Stripe's own errors travel up from the SDK unwrapped. This turns the ones a publisher
// can act on into a Ghost error, so everything below can read an unrecognised error as
// ours rather than having to know Stripe's vocabulary.
export async function attributingStripeRejections<T>(work: () => Promise<T>): Promise<T> {
    try {
        return await work();
    } catch (error) {
        const type = (error as {type?: unknown})?.type;
        if (typeof type === 'string' && ROW_LEVEL_STRIPE_ERRORS.has(type)) {
            throw new errors.DataImportError({message: (error as Error).message, err: error});
        }
        throw error;
    }
}
