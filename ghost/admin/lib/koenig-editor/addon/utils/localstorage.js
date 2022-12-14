/**
 * Returns the value for a localstorage key.
 * Silently ignores errors.
 * @param {string} key
 * @returns {string?} The value
 */
export function get(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        // do nothing here
    }
}

/**
 * Sets a localstorage value at the key `key`.
 * Silently ignores errors.
 * @param {string} key The key where to store the value
 * @param {string} value The value to store
 */
export function set(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        // do nothing here
    }
}
