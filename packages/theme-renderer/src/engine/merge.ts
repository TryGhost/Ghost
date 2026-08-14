/**
 * Minimal deep merge standing in for lodash `_.merge({}, a, b)` as used by
 * express-hbs when combining templateOptions with local template options.
 *
 * Differences from lodash (accepted): arrays are overwritten rather than
 * merged index-wise; only plain objects are merged recursively — class
 * instances (e.g. Map, SafeString) are assigned by reference.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

export function mergeDeep(
    target: Record<string, unknown>,
    ...sources: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
    for (const source of sources) {
        if (!source) {
            continue;
        }
        for (const key of Object.keys(source)) {
            const sourceValue = source[key];
            if (sourceValue === undefined) {
                // lodash merge skips undefined source values
                continue;
            }
            const targetValue = target[key];
            if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
                mergeDeep(targetValue, sourceValue);
            } else if (isPlainObject(sourceValue)) {
                target[key] = mergeDeep({}, sourceValue);
            } else {
                target[key] = sourceValue;
            }
        }
    }
    return target;
}
