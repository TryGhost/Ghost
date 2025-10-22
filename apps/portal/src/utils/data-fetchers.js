/**
 * Data fetching utilities for Portal App
 * Handles fetching state from various sources: API, dev mode, preview mode, links, notifications
 */

import * as Fixtures from './fixtures';
import {hasMode} from './check-mode';
import {parseOfferQueryString, parsePreviewQueryString, parsePortalLinkPath} from './url-parsers';
import NotificationParser from './notifications';
import {createPopupNotification, hasRecommendations} from './helpers';
import {setupFirstPromoter, setupSentry} from './setup-integrations';
import setupGhostApi from './api';

const DEV_MODE_DATA = {
    showPopup: true,
    site: Fixtures.site,
    member: Fixtures.member.free,
    page: 'accountEmail',
    ...Fixtures.paidMemberOnTier(),
    pageData: Fixtures.offer
};

/**
 * Fetch site and member session data with Ghost APIs
 */
export async function fetchApiData({siteUrl, customSiteUrl, apiUrl, apiKey, api, getColorOverride}) {
    try {
        const GhostApi = api || setupGhostApi({siteUrl, apiUrl, apiKey});
        const {site, member} = await GhostApi.init();

        const colorOverride = getColorOverride?.();
        if (colorOverride) {
            site.accent_color = colorOverride;
        }

        setupFirstPromoter({site, member});
        setupSentry({site});
        return {GhostApi, site, member};
    } catch (e) {
        if (hasMode(['dev', 'test'], {customSiteUrl})) {
            return {GhostApi: api};
        }
        throw e;
    }
}

/**
 * Fetch state for Dev mode
 */
export function fetchDevData({customSiteUrl, showPopup}) {
    // Setup custom dev mode data from fixtures
    if (hasMode(['dev']) && !customSiteUrl) {
        return DEV_MODE_DATA;
    }

    // Setup test mode data
    if (hasMode(['test'])) {
        return {
            showPopup: showPopup !== undefined ? showPopup : true
        };
    }
    return {};
}

/**
 * Fetch state from Offer Preview mode query string
 */
export function fetchOfferQueryStrData(qs = '') {
    return parseOfferQueryString(qs);
}

/**
 * Fetch state from Preview mode Query String
 */
export function fetchQueryStrData(qs = '') {
    return parsePreviewQueryString(qs);
}

/**
 * Fetch state data for billing notification
 */
export function fetchNotificationData(state) {
    const {type, status, duration, autoHide, closeable} = NotificationParser({billingOnly: true}) || {};
    if (['stripe:billing-update'].includes(type)) {
        if (status === 'success') {
            const popupNotification = createPopupNotification({
                type, status, duration, closeable, autoHide, state,
                message: status === 'success' ? 'Billing info updated successfully' : ''
            });
            return {
                showPopup: true,
                popupNotification
            };
        }
        return {
            showPopup: true
        };
    }
    return {};
}

/**
 * Fetch state from Portal Links
 */
export function fetchLinkData(site, member) {
    const qParams = new URLSearchParams(window.location.search);
    if (qParams.get('action') === 'unsubscribe') {
        // if the user is unsubscribing from a newsletter with an old unsubscribe link that we can't validate, push them to newsletter mgmt where they have to log in
        if (qParams.get('key') && qParams.get('uuid')) {
            return {
                showPopup: true,
                page: 'unsubscribe',
                pageData: {
                    uuid: qParams.get('uuid'),
                    key: qParams.get('key'),
                    newsletterUuid: qParams.get('newsletter'),
                    comments: qParams.get('comments')
                }
            };
        } else { // any malformed unsubscribe links should simply go to email prefs
            return {
                showPopup: true,
                page: 'accountEmail',
                pageData: {
                    newsletterUuid: qParams.get('newsletter'),
                    action: 'unsubscribe',
                    redirect: site.url + '#/portal/account/newsletters'
                }
            };
        }
    }

    if (hasRecommendations({site}) && qParams.get('action') === 'signup' && qParams.get('success') === 'true') {
        // After a successful signup, we show the recommendations if they are enabled
        return {
            showPopup: true,
            page: 'recommendations',
            pageData: {
                signup: true
            }
        };
    }

    const [path, hashQueryString] = window.location.hash.substr(1).split('?');
    const hashQuery = new URLSearchParams(hashQueryString ?? '');
    const productMonthlyPriceQueryRegex = /^(?:(\w+?))?\/monthly$/;
    const productYearlyPriceQueryRegex = /^(?:(\w+?))?\/yearly$/;
    const offersRegex = /^offers\/(\w+?)\/?$/;
    const linkRegex = /^\/portal\/?(?:\/(\w+(?:\/\w+)*))?\/?$/;
    const feedbackRegex = /^\/feedback\/(\w+?)\/(\w+?)\/?$/;

    if (path && feedbackRegex.test(path)) {
        const [, postId, scoreString] = path.match(feedbackRegex);
        const score = parseInt(scoreString);
        if (score === 1 || score === 0) {
            // if logged in, submit feedback
            if (member || (hashQuery.get('uuid') && hashQuery.get('key'))) {
                return {
                    showPopup: true,
                    page: 'feedback',
                    pageData: {
                        uuid: member ? null : hashQuery.get('uuid'),
                        key: member ? null : hashQuery.get('key'),
                        postId,
                        score
                    }
                };
            } else {
                return {
                    showPopup: true,
                    page: 'signin',
                    pageData: {
                        redirect: site.url + `#/feedback/${postId}/${score}/`
                    }
                };
            }
        }
    }
    if (path && linkRegex.test(path)) {
        const [,pagePath] = path.match(linkRegex);
        const {page, pageQuery, pageData} = parsePortalLinkPath(pagePath, site) || {};
        const lastPage = ['accountPlan', 'accountProfile'].includes(page) ? 'accountHome' : null;
        const showPopup = (
            ['monthly', 'yearly'].includes(pageQuery) ||
            productMonthlyPriceQueryRegex.test(pageQuery) ||
            productYearlyPriceQueryRegex.test(pageQuery) ||
            offersRegex.test(pageQuery)
        ) ? false : true;
        return {
            showPopup,
            ...(page ? {page} : {}),
            ...(pageQuery ? {pageQuery} : {}),
            ...(pageData ? {pageData} : {}),
            ...(lastPage ? {lastPage} : {})
        };
    }
    return {};
}

/**
 * Fetch state from Preview mode
 */
export function fetchPreviewData() {
    const [, qs] = window.location.hash.substr(1).split('?');
    if (hasMode(['preview'])) {
        let data = {};
        if (hasMode(['offerPreview'])) {
            data = fetchOfferQueryStrData(qs);
        } else {
            data = fetchQueryStrData(qs);
        }
        return {
            ...data,
            showPopup: true
        };
    }
    return {};
}

/**
 * Orchestrate fetching data from all available sources
 */
export async function fetchAllData({apiConfig, customSiteUrl, showPopup, getColorOverride}) {
    const {GhostApi, site: apiSiteData, member} = await fetchApiData({...apiConfig, getColorOverride});
    const {site: devSiteData, ...restDevData} = fetchDevData({customSiteUrl, showPopup});
    const {site: linkSiteData, ...restLinkData} = fetchLinkData(apiSiteData, member);
    const {site: previewSiteData, ...restPreviewData} = fetchPreviewData();
    const {site: notificationSiteData, ...restNotificationData} = fetchNotificationData();
    let page = '';

    return {
        GhostApi,
        member,
        page,
        site: {
            ...apiSiteData,
            ...linkSiteData,
            ...previewSiteData,
            ...notificationSiteData,
            ...devSiteData,
            plans: {
                ...(devSiteData || {}).plans,
                ...(apiSiteData || {}).plans,
                ...(previewSiteData || {}).plans
            }
        },
        ...restDevData,
        ...restLinkData,
        ...restNotificationData,
        ...restPreviewData
    };
}
