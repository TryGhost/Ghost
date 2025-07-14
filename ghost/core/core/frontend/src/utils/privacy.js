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
 * 
 * @param {Object} payload - The payload to mask
 * @param {string[]} [attributesToMask] - Custom list of attributes to mask
 * @returns {string} JSON string with masked values
 */
export function maskSensitiveData(payload, attributesToMask = SENSITIVE_ATTRIBUTES) {
    // Deep copy
    let payloadStr = JSON.stringify(payload);
    
    attributesToMask.forEach(attr => {
        payloadStr = payloadStr.replace(
            new RegExp(`("${attr}"):(".+?"|\\d+)`, 'mgi'),
            '$1:"********"'
        );
    });
    
    return payloadStr;
}

/**
 * Process a payload with sensitive data masked
 * 
 * @param {Object} payload - The original payload 
 * @param {Object} globalAttributes - Additional attributes to add
 * @param {boolean} stringify - Whether to return a string or object
 * @returns {string|Object} Processed payload
 */
export function processPayload(payload, globalAttributes = {}, stringify = true) {
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