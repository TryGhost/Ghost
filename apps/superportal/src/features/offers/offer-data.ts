/**
 * Offer fetching. In production, fetch the offer from the content API by code.
 * In dev (no backend) return a fixture so the landing page renders standalone —
 * same state-first/fallback spirit as `loadTiers`.
 */

import type {MembersApiClient, Offer} from '../../shared/api-client';
import type {MemberState} from '../../types';
import {isActiveOffer, isRetentionOffer} from '../../shared/pricing';
import {warn} from '../../shared/log';

/**
 * Portal's offer routing (app.js:950-996): paid members are silently blocked,
 * invalid offers are silently dropped, and `portal_button: false` skips the
 * landing page straight to checkout.
 */
export function decideOfferRoute({member, portalButton, offer}: {
    member: MemberState | null;
    portalButton: boolean | undefined;
    offer: Offer | null;
}): 'skip' | 'checkout' | 'modal' {
    if (member && (member.status === 'paid' || member.status === 'gift')) return 'skip';
    if (!offer || !offer.tier || !isActiveOffer(offer) || isRetentionOffer(offer)) return 'skip';
    return portalButton === false ? 'checkout' : 'modal';
}

const DEV_OFFER: Offer = {
    id: 'demo',
    name: 'Black Friday',
    code: 'demo',
    display_title: 'Black Friday Special',
    display_description: 'Our biggest discount of the year — get a full year of Silver for less.',
    type: 'percent',
    cadence: 'year',
    amount: 40,
    duration: 'once',
    currency: 'usd',
    status: 'active',
    redemption_type: 'signup',
    tier: {id: 'silver', name: 'Silver'},
};

export async function loadOffer(api: MembersApiClient, code: string): Promise<Offer | null> {
    if (import.meta.env.DEV) {
        return {...DEV_OFFER, id: code || DEV_OFFER.id, code};
    }
    try {
        const res = await api.site.offer({offerId: code});
        return res.offers?.[0] ?? null;
    } catch (err) {
        warn('failed to load offer', err);
        return null;
    }
}
