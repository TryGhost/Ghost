import type {MemberState, SiteState, SiteTier, Translator} from '../../types';
import type {Subscription} from '../../shared/api-client';

/** Defaults matching apps/portal transistor-podcasts-action.js#TRANSISTOR_DEFAULTS. */
export const TRANSISTOR_DEFAULTS = {
    heading: 'Podcasts',
    description: 'Access your RSS feeds',
    button_text: 'Manage',
    url_template: 'https://partner.transistor.fm/ghost/{memberUuid}'
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidMemberUuid(uuid: string | undefined): uuid is string {
    return typeof uuid === 'string' && UUID_RE.test(uuid);
}

function defaultOr(value: string | undefined, def: string, translated: string): string {
    return !value || value === def ? translated : value;
}

/**
 * Default strings are translated; custom admin-configured strings display
 * as-is. Ports transistor-podcasts-action.js.
 */
export function resolveTransistorDisplay(site: SiteState, t: Translator): {heading: string; description: string; buttonText: string; urlTemplate: string} {
    return {
        heading: defaultOr(site.transistor_portal_heading, TRANSISTOR_DEFAULTS.heading, t('Podcasts')),
        description: defaultOr(site.transistor_portal_description, TRANSISTOR_DEFAULTS.description, t('Access your RSS feeds')),
        buttonText: defaultOr(site.transistor_portal_button_text, TRANSISTOR_DEFAULTS.button_text, t('Manage')),
        urlTemplate: site.transistor_portal_url_template || TRANSISTOR_DEFAULTS.url_template
    };
}

export function buildTransistorUrl(urlTemplate: string, memberUuid: string): string {
    return urlTemplate.replace('{memberUuid}', memberUuid);
}

/** Asks Transistor whether this member has podcasts. Ports use-integrations.js. */
export async function checkTransistorMembership(memberUuid: string, signal: AbortSignal): Promise<boolean> {
    const res = await fetch(`https://partner.transistor.fm/ghost/member/${memberUuid}`, {signal});
    if (!res.ok) return false;
    const data = (await res.json()) as {member?: boolean} | null;
    return data?.member === true;
}

interface GiftEligibilityArgs {
    memberStatus: MemberState['status'] | undefined;
    subscription: Subscription | undefined;
    siteTiers: SiteTier[] | undefined;
    paidMembersEnabled: boolean | undefined;
}

/**
 * Gift members can convert to a paid subscription while their tier is still
 * sold (not archived) and an expiry is known. Ports
 * continue-gift-subscription-banner.js gating.
 */
export function canContinueGiftSubscription({memberStatus, subscription, siteTiers, paidMembersEnabled}: GiftEligibilityArgs): boolean {
    if (memberStatus !== 'gift' || paidMembersEnabled !== true) return false;
    const tier = subscription?.tier;
    if (!tier?.id || !tier.expiry_at) return false;
    return (siteTiers ?? []).some(siteTier => siteTier.id === tier.id);
}
