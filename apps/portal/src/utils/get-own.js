/**
 * Get an own property of an object.
 *
 * @template {object} T
 * @template {keyof T} K
 * @param {T} obj
 * @param {K} key
 * @returns {undefined | T[K]}
 */
export const getOwn = (obj, key) => (
    Object.hasOwn(obj, key) ? obj[key] : undefined
);