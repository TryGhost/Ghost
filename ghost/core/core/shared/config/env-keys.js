const PREFIX = 'GHOST_';

// Documented config keys that have no entry in defaults.json
const SUPPLEMENTARY_KEYS = [
    'database__client',
    'database__connection__host',
    'database__connection__port',
    'database__connection__user',
    'database__connection__password',
    'database__connection__database',
    'database__connection__filename',
    'mail__transport',
    'mail__from',
    'mail__options__service',
    'mail__options__host',
    'mail__options__port',
    'mail__options__secure',
    'mail__options__auth__user',
    'mail__options__auth__pass'
];

// Environment variables Ghost reads directly from process.env - these are not config keys
const INTERNAL_ENV_VARS = new Set([
    'GHOST_DEV_IS_DOCKER',
    'GHOST_CI_SHUTDOWN_AFTER_BOOT',
    'GHOST_BUILD_VERSION',
    'GHOST_NODE_VERSION_CHECK'
]);

/**
 * Builds an index from uppercased nested key paths to their canonical casing,
 * e.g. 'PATHS__CONTENTPATH' -> 'paths__contentPath'
 *
 * @param {object} defaults - parsed defaults.json
 * @returns {Object.<string, string>}
 */
function buildCanonicalKeyIndex(defaults) {
    const index = {};

    const walk = (obj, prefix) => {
        Object.entries(obj).forEach(([key, value]) => {
            const keyPath = prefix ? `${prefix}__${key}` : key;
            index[keyPath.toUpperCase()] = keyPath;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                walk(value, keyPath);
            }
        });
    };

    walk(defaults, '');

    SUPPLEMENTARY_KEYS.forEach((key) => {
        index[key.toUpperCase()] = key;
    });

    return index;
}

/**
 * Creates an nconf env transform that maps GHOST_-prefixed environment variables
 * to config keys. Uppercase variables are mapped back to their canonical casing via
 * the key index, mixed-case variables are used as given (minus the prefix), and
 * remaining all-uppercase variables are lowercased and recorded in `unmatchedKeys`.
 *
 * When both a GHOST_-prefixed variable and its plain equivalent are set, the
 * prefixed variable wins.
 *
 * @param {object} defaults - parsed defaults.json
 * @returns {{transform: function({key: string, value: string}): ({key: string, value: string}|undefined), unmatchedKeys: Map<string, string>}}
 */
function createEnvTransform(defaults) {
    const index = buildCanonicalKeyIndex(defaults);
    const unmatchedKeys = new Map();

    const mapPrefixedKey = (key) => {
        const remainder = key.slice(PREFIX.length);
        const canonical = index[remainder.toUpperCase()];

        if (canonical) {
            return canonical;
        }

        if (/[a-z]/.test(remainder)) {
            return remainder;
        }

        unmatchedKeys.set(key, remainder.toLowerCase());
        return remainder.toLowerCase();
    };

    const prefixedTargets = new Set(
        Object.keys(process.env)
            .filter(key => key.startsWith(PREFIX) && !INTERNAL_ENV_VARS.has(key))
            .map(mapPrefixedKey)
    );

    const transform = (obj) => {
        if (INTERNAL_ENV_VARS.has(obj.key)) {
            return obj;
        }

        if (obj.key.startsWith(PREFIX)) {
            return {key: mapPrefixedKey(obj.key), value: obj.value};
        }

        if (prefixedTargets.has(obj.key)) {
            return undefined;
        }

        return obj;
    };

    return {transform, unmatchedKeys};
}

module.exports = {
    createEnvTransform
};
