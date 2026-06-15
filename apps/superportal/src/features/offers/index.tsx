/**
 * Offers feature chunk — offer landing / redemption modal.
 *
 * Trigger paths (parsed by the shell):
 *  - ?offer=CODE                  → params.offerCode
 *  - data-portal="offer/{code}"   → params.code
 *  - #/portal/offers/{code}       → params.code
 *
 * Uses a content-API-credentialed client (offer metadata comes from the
 * content API); checkout still goes through the members API on the same client.
 */

import {type ReactElement} from 'react';
import {OfferModal} from './OfferModal';
import offersCss from './offers.css?inline';
import {createApiClientFromSite} from '../../shared/api-client';
import {ensureSiteData} from '../../shared/api-client/site-data';
import {warn} from '../../shared/log';
import {loadOffer, decideOfferRoute} from './offer-data';
import type {FeatureMount} from '../../types';

export const mount: FeatureMount = async ({services, params}) => {
    const state = services.getState();
    const site = state.site;
    const member = state.member;

    // Portal blocks paid members from offer links before doing anything else.
    if (member && (member.status === 'paid' || member.status === 'gift')) return;

    const api = createApiClientFromSite(site);
    const offerCode = params?.offerCode ?? params?.code ?? params?.offer ?? '';

    await ensureSiteData(services, api);
    const offer = await loadOffer(api, offerCode);

    const route = decideOfferRoute({member, portalButton: site.portal_button, offer});
    if (route === 'skip' || !offer) {
        warn('offer unavailable — skipping');
        return;
    }

    if (route === 'checkout') {
        // portal_button:false — no landing page, straight to Stripe.
        const handle = services.openModal(<CheckoutSpinner />, {css: offersCss, panelClass: 'gh-offer-modal-panel'});
        try {
            await api.member.checkoutPlan({offerId: offer.id});
        } catch (err) {
            warn('offer checkout error', err);
            handle.close();
        }
        return;
    }

    const handle = services.openModal(
        <OfferModal
            services={services}
            api={api}
            offer={offer}
            onClose={() => handle.close()}
        />,
        {css: offersCss, panelClass: 'gh-offer-modal-panel'}
    );
};

function CheckoutSpinner(): ReactElement {
    return (
        <div className="gh:flex gh:justify-center gh:py-10">
            <div className="gh:h-6 gh:w-6 gh:animate-spin gh:rounded-full gh:border-2 gh:border-[#dadee2] gh:border-t-[#15171a]" />
        </div>
    );
}
