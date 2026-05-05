/**
 * Normalise a Bookshelf model or plain object to its JSON representation.
 *
 * Bookshelf models expose their data via `.toJSON()` and store it on a private
 * `attributes` map; spreading them with `{...model}` skips the prototype-defined
 * getters (including `id`) and so silently loses the data. This helper lets
 * callers accept either shape uniformly:
 *
 *   const data = toPlain(post);
 *   urlService.facade.getUrlForResource({...data, type: 'posts'}, ...)
 *
 * @template T
 * @param {T | {toJSON(): T}} modelOrObj
 * @returns {T}
 */
module.exports = function toPlain(modelOrObj) {
    if (modelOrObj && typeof modelOrObj.toJSON === 'function') {
        return modelOrObj.toJSON();
    }
    return modelOrObj;
};
