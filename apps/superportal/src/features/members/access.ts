/**
 * Signup/signin access rules ported 1:1 from Portal's utils/helpers.js.
 * Tier "portal visibility" uses tier.visibility (modern Ghost); when the
 * admin preview supplies a portal_products id list (its unsaved visibility
 * state), that list replaces the visibility check — same as Portal, where
 * portal_products WAS the visibility mechanism.
 */

import type {SiteState, SiteTier} from '../../types';

const DEFAULT_PLANS = ['free', 'monthly', 'yearly'];

function portalPlans(site: SiteState): string[] {
    return site.portal_plans ?? DEFAULT_PLANS;
}

export function isInviteOnly(site: SiteState): boolean {
    return site.members_signup_access === 'invite';
}

export function isPaidMembersOnly(site: SiteState): boolean {
    return site.members_signup_access === 'paid';
}

export function isSigninAllowed(site: SiteState): boolean {
    return site.members_signup_access !== 'none';
}

export function isFreeSignupAllowed(site: SiteState): boolean {
    return site.members_signup_access === 'all';
}

export function hasFreeProductPrice(site: SiteState): boolean {
    return isFreeSignupAllowed(site) && portalPlans(site).includes('free');
}

export function getFreeTier(site: SiteState): SiteTier | undefined {
    return (site.tiers ?? []).find(t => t.type === 'free');
}

/** Paid tiers portal can sell: visible, both cadences priced, sorted by monthly price. */
export function availablePaidTiers(site: SiteState): SiteTier[] {
    const plans = portalPlans(site);
    if (!plans.includes('monthly') && !plans.includes('yearly')) {
        return [];
    }
    if (!site.paid_members_enabled) {
        return [];
    }
    return (site.tiers ?? [])
        .filter(t => t.type !== 'free')
        .filter(t => (site.portal_products ? site.portal_products.includes(t.id) : t.visibility !== 'none'))
        .filter(t => !!t.monthly_price && !!t.yearly_price)
        .slice()
        .sort((a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0));
}

/** Products shown on signup: available paid tiers with the free tier prepended. */
export function getSignupTiers(site: SiteState, pageQuery?: string): SiteTier[] {
    if (pageQuery === 'free') {
        return [];
    }
    const tiers = availablePaidTiers(site);
    if (hasFreeProductPrice(site)) {
        const free = getFreeTier(site) ?? {id: 'free', name: 'Free', type: 'free' as const};
        return [free, ...tiers];
    }
    return tiers;
}

/** Count of purchasable prices: free + each portal_plans cadence per paid tier. */
export function countAvailablePrices(site: SiteState, pageQuery?: string): number {
    let count = hasFreeProductPrice(site) ? 1 : 0;
    if (!(pageQuery === 'free' && hasFreeProductPrice(site))) {
        const plans = portalPlans(site);
        const cadences = (plans.includes('monthly') ? 1 : 0) + (plans.includes('yearly') ? 1 : 0);
        count += availablePaidTiers(site).length * cadences;
    }
    return count;
}

export function hasAvailablePrices(site: SiteState, pageQuery?: string): boolean {
    return countAvailablePrices(site, pageQuery) > 0;
}

export function hasOnlyFreePlan(site: SiteState): boolean {
    const count = countAvailablePrices(site);
    return count === 0 || (count === 1 && hasFreeProductPrice(site));
}

export function isSignupAllowed(site: SiteState): boolean {
    const hasSignupAccess = site.members_signup_access === 'all' || site.members_signup_access === 'paid';
    const hasSignupConfigured = !!site.paid_members_enabled || hasOnlyFreePlan(site);
    return hasSignupAccess && hasSignupConfigured;
}

export function hasMultipleNewsletters(site: SiteState): boolean {
    return (site.newsletters ?? []).length > 1;
}

export function hasFreeTrialTier(site: SiteState, pageQuery?: string): boolean {
    return getSignupTiers(site, pageQuery).some(t => !!t.trial_days);
}

/** Portal's full-size signup rule (popup-modal.js:185). */
export function isFullScreenSignup(site: SiteState, pageQuery?: string): boolean {
    return getSignupTiers(site, pageQuery).length > 1 && !isInviteOnly(site) && hasAvailablePrices(site, pageQuery);
}
