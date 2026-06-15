import type {MemberState, SiteState} from '../types';

const SCRIPT_SRC = 'https://cdn.firstpromoter.com/fprom.js';

/**
 * Affiliate tracking via FirstPromoter. When the site has a
 * `firstpromoter_account` configured, load fprom.js, init it against the root
 * domain (leading `.` so the FPROM cookie spans all subdomains), and report a
 * signup event for members created in the last 24h.
 *
 * Mirrors apps/portal/src/app.js#setupFirstPromoter.
 */
export function setupFirstPromoter({site, member}: {site: SiteState; member: MemberState | null}, doc: Document = document): void {
    const firstPromoterId = site.firstpromoter_account;
    const siteDomain = getTrackingDomain(site.url);
    if (!firstPromoterId || !siteDomain) return;

    const fpScript = doc.createElement('script');
    fpScript.type = 'text/javascript';
    fpScript.async = true;
    fpScript.src = SCRIPT_SRC;
    fpScript.onload = () => {
        try {
            window.$FPROM?.init?.(firstPromoterId, siteDomain);
            if (member && isRecentMember(member)) {
                if (window.$FPROM) {
                    window.$FPROM.trackSignup?.({email: member.email, uid: member.uuid});
                } else {
                    const fprom = window._fprom ?? [];
                    window._fprom = fprom;
                    fprom.push(['event', 'signup']);
                    fprom.push(['email', member.email]);
                    fprom.push(['uid', member.uuid]);
                }
            }
        } catch {
            // Tracking is best-effort; never break the page.
        }
    };
    const firstScript = doc.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(fpScript, firstScript);
    } else {
        doc.head.appendChild(fpScript);
    }
}

function getTrackingDomain(siteUrl: string): string | undefined {
    let domain: string;
    try {
        domain = new URL(siteUrl).origin.replace(/^http(s?):\/\//, '').replace(/\/$/, '');
    } catch {
        domain = siteUrl.replace(/^http(s?):\/\//, '').replace(/\/$/, '');
    }
    return domain.replace(/^(\S*\.)?(\S*\.\S*)$/i, '.$2') || undefined;
}

function isRecentMember(member: MemberState): boolean {
    if (!member.created_at) return false;
    const diffHours = Math.round((Date.now() - new Date(member.created_at).getTime()) / (1000 * 60 * 60));
    return diffHours < 24;
}
