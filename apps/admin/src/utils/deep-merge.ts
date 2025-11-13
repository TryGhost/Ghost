/**
 * Deep partial type that makes all properties optional recursively.
 */
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

/**
 * Check if a value is a plain object (not an instance of a class like Date, Map, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    // Check if it's a plain object created with {} or new Object()
    const proto = Object.getPrototypeOf(value) as object | null;
    return proto === null || proto === Object.prototype;
}

/**
 * Deep merge utility for preferences objects.
 * Recursively merges nested objects, with values from `source` taking precedence.
 * Only plain objects are recursively merged; complex objects (Date, Map, etc.) are copied as-is.
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
    const result: Record<string, unknown> = { ...target };

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = target[key];

            if (sourceValue !== undefined) {
                if (
                    isPlainObject(sourceValue) &&
                    isPlainObject(targetValue)
                ) {
                    result[key] = deepMerge(
                        targetValue as Record<string, unknown>,
                        sourceValue as DeepPartial<Record<string, unknown>>
                    );
                } else {
                    result[key] = sourceValue;
                }
            }
        }
    }

    return result as T;
}
