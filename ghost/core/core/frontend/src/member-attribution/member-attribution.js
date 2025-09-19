/* eslint-env browser */
/* eslint-disable no-console */
const urlAttribution = require('../utils/url-attribution');
const parseReferrerData = urlAttribution.parseReferrerData;
const getReferrer = urlAttribution.getReferrer;

// Location where we want to store the history in sessionStorage
const STORAGE_KEY = 'ghost-history';

// How long before an item should expire (24h)
// Note: With sessionStorage, data automatically expires when the session ends,
// but we still enforce time limits for long-running sessions
const TIMEOUT = 24 * 60 * 60 * 1000;

// Maximum amount of urls in the history
const LIMIT = 15;

// History is saved in JSON format, from old to new
// Time is saved to be able to exclude old items
// [
//     {
//         "time": 12341234,
//         "path": "/about/"
//     },
//     {
//         "time": 12341234,
//         "id": "manually-added-id",
//         "type": "post",
//     },
//     {
//         "time": 12341235,
//         "path": "/welcome/"
//     }
// ]

(async function () {
    try {
        const storage = window.sessionStorage;
        const historyString = storage.getItem(STORAGE_KEY);
        const currentTime = new Date().getTime();

        // Append current location
        let history = [];

        if (historyString) {
            try {
                history = JSON.parse(historyString);
            } catch (error) {
                // Ignore invalid JSON, and clear history
                console.warn('[Member Attribution] Error while parsing history', error);
            }
        }

        // Remove all items that are expired
        const firstNotExpiredIndex = history.findIndex((item) => {
            // Return true to keep all items after and including this item
            // Return false to remove the item

            if (!item.time || typeof item.time !== 'number') {
                return false;
            }

            const difference = currentTime - item.time;

            if (isNaN(item.time) || difference > TIMEOUT) {
                // Expired or invalid
                return false;
            }

            // Valid item (so all following items are also valid by definition)
            return true;
        });

        if (firstNotExpiredIndex > 0) {
            // Remove until the first valid item
            history.splice(0, firstNotExpiredIndex);
        } else if (firstNotExpiredIndex === -1) {
            // Not a single valid item found, remove all
            history = [];
        }

        // Get detailed referrer information using parseReferrerData
        let referrerData;
        try {
            referrerData = parseReferrerData(window.location.href);
        } catch (e) {
            console.error('[Member Attribution] Parsing referrer failed', e);
            referrerData = {source: null, medium: null, url: null};
        }

        // Store all attribution data together
        // We'll spread this object when creating history entries
        const attributionData = {
            referrerSource: referrerData.source,
            referrerMedium: referrerData.medium,
            utmSource: referrerData.utmSource,
            utmMedium: referrerData.utmMedium,
            utmCampaign: referrerData.utmCampaign,
            utmTerm: referrerData.utmTerm,
            utmContent: referrerData.utmContent
        };
        
        // Use the getReferrer helper to handle same-domain referrer filtering
        // This will return null if the referrer is from the same domain
        let referrerUrl;
        try {
            referrerUrl = getReferrer(window.location.href);
            // If no referrer value returned by getReferrer but we have a document.referrer,
            // use the original URL from parseReferrerData
            if (!referrerUrl && referrerData.url) {
                referrerUrl = referrerData.url;
            }
        } catch (e) {
            console.error('[Member Attribution] Getting final referrer failed', e);
            referrerUrl = referrerData.url;
        }

        // Do we have attributions in the query string?
        try {
            const url = new URL(window.location.href);
            const params = url.searchParams;
            if (params.get('attribution_id') && params.get('attribution_type')) {
                // Add attribution to history before the current path
                history.push({
                    time: currentTime,
                    id: params.get('attribution_id'),
                    type: params.get('attribution_type'),
                    ...attributionData,
                    referrerUrl
                });

                // Remove attribution from query string
                params.delete('attribution_id');
                params.delete('attribution_type');
                url.search = '?' + params.toString();
                window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
            }
        } catch (error) {
            console.error('[Member Attribution] Parsing attribution from querystring failed', error);
        }

        const currentPath = window.location.pathname;

        if (history.length === 0 || history[history.length - 1].path !== currentPath) {
            history.push({
                path: currentPath,
                time: currentTime,
                ...attributionData,
                referrerUrl
            });
        } else if (history.length > 0) {
            const lastEntry = history[history.length - 1];
            lastEntry.time = currentTime;
            
            // Update with any new attribution data (filters out null/undefined values)
            Object.entries(attributionData).forEach(([key, value]) => {
                if (value) {
                    lastEntry[key] = value;
                }
            });
            
            if (referrerUrl) {
                lastEntry.referrerUrl = referrerUrl;
            }
        }

        // Restrict length
        if (history.length > LIMIT) {
            history = history.slice(-LIMIT);
        }

        // Save current timestamp
        storage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('[Member Attribution] Failed with error', error);
    }
})();
