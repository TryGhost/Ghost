/* eslint-disable ghost/ghost-custom/no-native-error */

/**
 * Converts an unknown value to an Error object, if it isn't already.
 */
export const errify = (value: unknown): Error => {
    if (value instanceof Error) {
        return value;
    }

    if ((value === null) || (value === undefined)) {
        return new Error();
    }

    const valuesSeen = new Set<unknown>();
    while (
        !valuesSeen.has(value) &&
        value &&
        typeof value === 'object' &&
        'message' in value
    ) {
        value = value.message;
        valuesSeen.add(value);
    }

    let message: string;
    try {
        message = String(value);
    } catch {
        message = Object.prototype.toString.call(value);
    }

    return new Error(message);
};
