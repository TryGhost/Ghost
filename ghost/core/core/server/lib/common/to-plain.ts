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
 */
type JsonSerializable<T> = {
    toJSON(): T;
};

const isJsonSerializable = <T>(modelOrObj: T | JsonSerializable<T>): modelOrObj is JsonSerializable<T> => !!(
    modelOrObj
    && typeof modelOrObj === 'object'
    && 'toJSON' in modelOrObj
    && typeof modelOrObj.toJSON === 'function'
);

export const toPlain = <T>(modelOrObj: T | JsonSerializable<T>): T => (
    isJsonSerializable(modelOrObj) ? modelOrObj.toJSON() : modelOrObj
);
