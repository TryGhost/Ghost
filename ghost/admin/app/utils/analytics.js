// Wrapper function for Plausible event

function isPosthogLoaded() {
    return window.posthog?.__loaded;
}

/**
 * Hashes a user's email address so we can use it as a distinct_id in PostHog without storing the email address itself
 * 
 * 
 * @param {string} email an email address
 * @returns {(string|null)} a sha256 hash of the email address to use as distinct_id in PostHog — null if hashing fails
 */
async function hashEmail(email) {
    try {
        const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()));
        const hashArray = Array.from(new Uint8Array(digest));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        // Double-check that the hash is a valid sha256 hex string before returning it, else return null
        return hash.length === 64 ? hash : null;
    } catch (e) {
        // Modern browsers all support window.crypto, but we need to check for it to avoid errors on really old browsers
        // If any errors occur when hashing email, return null
        return null;
    }
}

/**
 * Sends a tracking event to Plausible and Posthog, if installed.
 * 
 * By default, Plausible and Posthog are not installed, in which case this function no-ops.
 * 
 * @param {string} eventName A string name for the event being tracked
 * @param {Object} [props={}] An optional object of properties to include with the event
 */
export function trackEvent(eventName, props = {}) {
    window.plausible = window.plausible || function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
    };
    window.plausible(eventName, {props: props});

    if (isPosthogLoaded()) {
        window.posthog.capture(eventName, props);
    }
}

/**
 * Calls posthog.identify() with a hashed email address as the distinct_id
 * 
 * @param {Object} user A user to identify in PostHog
 * @returns {void}
 */
export async function identifyUser(user) {
    // Return early if window.posthog doesn't exist
    if (!isPosthogLoaded()) {
        return;
    }
    // User the user exists and has an email address, identify them in PostHog
    if (user && user.get('email')) {
        const email = user.get('email');
        const hashedEmail = await hashEmail(email);
        const distinctId = window.posthog.get_distinct_id();
        // Only continue if hashing was successful, and the user hasn't already been identified
        if (hashedEmail && hashedEmail !== distinctId) {
            const props = {};
            // Add the user's id
            if (user.get('id')) {
                props.id = user.get('id');
            }
            // Add the user's role
            if (user.get('role').name) {
                props.role = user.get('role').name.toLowerCase();
            }
            // Add the user's created_at date
            if (user.get('createdAtUTC')) {
                props.created_at = user.get('createdAtUTC').toISOString();
            }
            window.posthog.identify(hashedEmail, props);
        }
    }
}

/**
 * Calls posthog.reset() to clear the current user's distinct_id and all associated properties
 * To be called when a user logs out
 * 
 * @returns {void}
 */
export function resetUser() {
    if (isPosthogLoaded()) {
        window.posthog.reset();
    }
}