// Location where we want to store the history in localStorage
const STORAGE_KEY = 'ghost-history';

// How long before an item should expire (24h)
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
        const storage = window.localStorage;
        const historyString = storage.getItem(STORAGE_KEY);
        const currentTime = new Date().getTime();

        // Append current location
        let history = [];

        if (historyString) {
            try {
                history = JSON.parse(historyString);
            } catch (error) {
                // Ignore invalid JSON, ans clear history
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

        // Fetch referrer data from query params
        let refParam;
        let sourceParam;
        let utmSourceParam;
        let utmMediumParam;
        let referrerSource;

        try {
            // Fetch source/medium from query param
            const url = new URL(window.location.href);
            refParam = url.searchParams.get('ref');
            sourceParam = url.searchParams.get('source');
            utmSourceParam = url.searchParams.get('utm_source');
            utmMediumParam = url.searchParams.get('utm_medium');

            referrerSource = refParam || sourceParam || utmSourceParam || null;

            // if referrerSource is not set, check to see if the url contains a hash like ghost.org/#/portal/signup?ref=ghost and pull the ref from the hash
            if (!referrerSource && url.hash && url.hash.includes('#/portal')) {
                const hashUrl = new URL(window.location.href.replace('/#/portal', ''));
                refParam = hashUrl.searchParams.get('ref');
                sourceParam = hashUrl.searchParams.get('source');
                utmSourceParam = hashUrl.searchParams.get('utm_source');
                utmMediumParam = hashUrl.searchParams.get('utm_medium');
    
                referrerSource = refParam || sourceParam || utmSourceParam || null;
            }
        } catch (e) {
            console.error('[Member Attribution] Parsing referrer from querystring failed', e);
        }

        const referrerMedium = utmMediumParam || null;
        const referrerUrl = window.document.referrer || null;

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
                    referrerSource,
                    referrerMedium,
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
                referrerSource,
                referrerMedium,
                referrerUrl
            });
        } else if (history.length > 0) {
            history[history.length - 1].time = currentTime;
            // Update referrer information for same path if available (e.g. when opening a link on same path via external referrer)
            if (referrerSource) {
                history[history.length - 1].referrerSource = referrerSource;
                history[history.length - 1].referrerMedium = referrerMedium;
            }
            if (referrerUrl) {
                history[history.length - 1].referrerUrl = referrerUrl;
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
