import type {JsonValue} from 'type-fest';

/**
 * Utility functions for data privacy and PII protection
 */

/**
 * Default attributes that should be masked for privacy
 */
export const SENSITIVE_ATTRIBUTES = [
    'username',
    'user',
    'user_id',
    'userid',
    'password',
    'pass',
    'pin',
    'passcode',
    'token',
    'api_token',
    'email',
    'address',
    'phone',
    'sex',
    'gender',
    'order',
    'order_id',
    'orderid',
    'payment',
    'credit_card'
];

/**
 * Mask sensitive attributes in a payload
 */
export function maskSensitiveData(payload: unknown, attributesToMask: ReadonlyArray<string> = SENSITIVE_ATTRIBUTES): string {
    // Deep copy
    let payloadStr = JSON.stringify(payload);

    attributesToMask.forEach((attr) => {
        payloadStr = payloadStr.replace(
            new RegExp(`("${attr}"):(".+?"|\\d+)`, 'mgi'),
            '$1:"********"'
        );
    });

    return payloadStr;
}

/**
 * Process a payload with sensitive data masked
 */
export function processPayload(payload: unknown, globalAttributes?: Record<string, unknown>, stringify?: true): string;
export function processPayload(payload: unknown, globalAttributes: Record<string, unknown>, stringify: false): JsonValue;
export function processPayload(payload: unknown, globalAttributes?: Record<string, unknown>, stringify?: boolean): string | JsonValue;
export function processPayload(payload: unknown, globalAttributes = {}, stringify = true): string | JsonValue {
    if (stringify) {
        const maskedStr = maskSensitiveData(payload);
        const processed = Object.assign({}, JSON.parse(maskedStr), globalAttributes);
        return JSON.stringify(processed);
    } else {
        const processed = Object.assign({}, payload, globalAttributes);
        const maskedStr = maskSensitiveData(processed);
        return JSON.parse(maskedStr);
    }
}
