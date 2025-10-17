import * as Sentry from '@sentry/react';
import {hasMode} from './check-mode';
import {isSentryEventAllowed, getFirstpromoterId, getSiteDomain, isRecentMember} from './helpers';

/**
 * Initialize Sentry error tracking
 * @param {Object} params - Configuration parameters
 * @param {Object} params.site - Site configuration with Sentry settings
 */
export function setupSentry({site}) {
    if (hasMode(['test'])) {
        return null;
    }

    const {portal_sentry: portalSentry, portal_version: portalVersion, version: ghostVersion} = site;
    // eslint-disable-next-line no-undef
    const appVersion = REACT_APP_VERSION || portalVersion;
    const releaseTag = `portal@${appVersion}|ghost@${ghostVersion}`;

    if (portalSentry && portalSentry.dsn) {
        Sentry.init({
            dsn: portalSentry.dsn,
            environment: portalSentry.env || 'development',
            release: releaseTag,
            beforeSend: (event) => {
                if (isSentryEventAllowed({event})) {
                    return event;
                }
                return null;
            },
            allowUrls: [
                /https?:\/\/((www)\.)?unpkg\.com\/@tryghost\/portal/
            ]
        });
    }
}

/**
 * Load and initialize FirstPromoter tracking script
 * @param {Object} params - Configuration parameters
 * @param {Object} params.site - Site configuration with FirstPromoter settings
 * @param {Object} params.member - Current member data for signup tracking
 */
export function setupFirstPromoter({site, member}) {
    if (hasMode(['test'])) {
        return null;
    }

    const firstPromoterId = getFirstpromoterId({site});
    let siteDomain = getSiteDomain({site});

    // Replace any leading subdomain and prefix the siteDomain with
    // a `.` to allow the FPROM cookie to be accessible across all subdomains
    // or the root.
    siteDomain = siteDomain?.replace(/^(\S*\.)?(\S*\.\S*)$/i, '.$2');

    if (firstPromoterId && siteDomain) {
        const fpScript = document.createElement('script');
        fpScript.type = 'text/javascript';
        fpScript.async = !0;
        fpScript.src = 'https://cdn.firstpromoter.com/fprom.js';
        fpScript.onload = fpScript.onreadystatechange = function () {
            let _t = this.readyState;
            if (!_t || 'complete' === _t || 'loaded' === _t) {
                try {
                    window.$FPROM.init(firstPromoterId, siteDomain);
                    if (isRecentMember({member})) {
                        const email = member.email;
                        const uid = member.uuid;
                        if (window.$FPROM) {
                            window.$FPROM.trackSignup({email: email, uid: uid});
                        } else {
                            const _fprom = window._fprom || [];
                            window._fprom = _fprom;
                            _fprom.push(['event', 'signup']);
                            _fprom.push(['email', email]);
                            _fprom.push(['uid', uid]);
                        }
                    }
                } catch (err) {
                    // Log FP tracking failure
                }
            }
        };
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode.insertBefore(fpScript, firstScript);
    }
}
