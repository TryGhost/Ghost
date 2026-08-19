import type {CheckoutConfigResult} from '../../services/tier-checkout-config';

const tiersService = require('../../services/tiers');

interface Frame {
    data: {tiers_checkout_config?: unknown[]};
    options: {id: string; [key: string]: unknown};
}

export type TierCheckoutResult = CheckoutConfigResult;

/**
 * A tier's checkout configuration, as a sub-resource of the tier rather than an attribute
 * of it.
 *
 * The tier resource is generally available and this concept is not, so putting it on the
 * tier payload would add a key to every tier response on every site whether or not the
 * feature is on. A route of its own can carry the flag, and be removed with it.
 *
 * Every operation here is one call. A tier's configuration is one shape the service hands
 * out and takes back, and that it spans tables, that destinations are site-wide, and that a
 * binding exists at all are facts about the inside of that domain.
 */
const controller = {
    docName: 'tiers_checkout_config',

    browse: {
        headers: {cacheInvalidate: false},
        // Every tier's configuration in one read, so a tier list can show what each asks
        // without a request per row.
        permissions: {docName: 'products', method: 'browse'},
        query(): Promise<TierCheckoutResult> {
            return tiersService.checkout.browse();
        }
    },

    read: {
        headers: {cacheInvalidate: false},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: {docName: 'products', method: 'read'},
        query(frame: Frame): Promise<TierCheckoutResult> {
            return tiersService.checkout.read(frame.options.id);
        }
    },

    edit: {
        headers: {cacheInvalidate: true},
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions: {docName: 'products', method: 'edit'},
        query(frame: Frame): Promise<TierCheckoutResult> {
            // Each part is replaced only if the request names it, so a client that knows
            // about the questions cannot erase the collection by staying silent.
            return tiersService.checkout.edit(frame.options.id, frame.data.tiers_checkout_config?.[0] ?? {});
        }
    }
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
