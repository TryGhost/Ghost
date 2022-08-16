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

        const currentPath = window.location.pathname;

        if (history.length === 0 || history[history.length - 1].path !== currentPath) {
            history.push({
                path: currentPath,
                time: currentTime
            });
        } else if (history.length > 0) {
            history[history.length - 1].time = currentTime;
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
