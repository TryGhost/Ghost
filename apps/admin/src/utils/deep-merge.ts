/**
 * Deep partial type that makes all properties optional recursively.
 */
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

/**
 * Deep merge utility for preferences objects.
 * Recursively merges nested objects, with values from `source` taking precedence.
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
    const result: Record<string, unknown> = { ...target };

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = target[key];

            if (sourceValue !== undefined) {
                if (
                    typeof sourceValue === 'object' &&
                    sourceValue !== null &&
                    !Array.isArray(sourceValue) &&
                    typeof targetValue === 'object' &&
                    targetValue !== null &&
                    !Array.isArray(targetValue)
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
