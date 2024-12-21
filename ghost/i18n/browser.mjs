// @ts-check
import {createInstance} from 'i18next';

/**
 * @typedef {'ghost'|'portal'|'test'|'signup-form'|'comments'|'search'|'newsletter'} GhostNamespace
 */

/**
 * @type {Partial<Record<GhostNamespace, ReturnType<typeof createInstance>>>}
 */
const asyncInstances = {};

/**
 * @param {GhostNamespace} ns
 */
export function getAsyncInstance (ns = 'portal') {
    if (asyncInstances[ns]) {
        return asyncInstances[ns];
    }

    throw new Error(`No cached i18n instance available for ${ns}`);
}

/**
 * @param {GhostNamespace} ns
 * @param {string} lng
 * @param {string} root The root path where locales are stored, following `${root}/${locale}/${ns}.json`
 */
export function createAsyncInstance(ns, lng, root) {
    const i18nextInstance = createInstance();

    i18nextInstance.use({
        type: 'backend',
        async read(locale, namespace, callback) {
            if (process.env.NODE_ENV !== 'production' && namespace !== ns) {
                return callback(new Error(`Namespace mismatch! Expected ${ns}, got ${namespace}`), null);
            }

            // CASE: locale is the default. The text is already translated, so avoid loading a translation file.
            if (locale === 'en') {
                callback(null, {});
                return;
            }

            try {
                const response = await fetch(`${root}/${locale}/${ns}.json`);
                const data = await response.json();
                callback(null, data);
            } catch (error) {
                callback(error, null);
            }
        },
    });

    i18nextInstance.init({
        lng,

        // allow keys to be phrases having `:`, `.`
        nsSeparator: false,
        keySeparator: false,

        // if the value is an empty string, return the key
        returnEmptyString: false,

        // do not load a fallback
        fallbackLng: false,

        ns: ns,
        defaultNS: ns,

        // separators
        interpolation: ns === 'newsletter' ? {
            prefix: '{',
            suffix: '}'
        } : {},
    });

    asyncInstances[ns] = i18nextInstance;
    return i18nextInstance;
}
