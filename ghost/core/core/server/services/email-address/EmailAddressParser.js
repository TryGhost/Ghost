const addressparser = require('nodemailer/lib/addressparser');

/**
 * @typedef {Object} EmailAddress
 * @property {string} address - The email address
 * @property {string} [name] - Optional name associated with the email
 */

module.exports = class EmailAddressParser {
    /**
     * Parse an email string into an EmailAddress object
     * @param {string} email - Email string to parse
     * @returns {EmailAddress|null} Parsed email or null if invalid
     */
    static parse(email) {
        if (!email || typeof email !== 'string' || !email.length) {
            return null;
        }

        const parsed = addressparser(email);

        if (parsed.length !== 1) {
            return null;
        }
        const first = parsed[0];

        // Check first has a group property
        if ('group' in first) {
            // Unsupported format
            return null;
        }

        return {
            address: first.address,
            name: first.name || undefined
        };
    }

    /**
     * Convert an EmailAddress object to a string representation
     * @param {EmailAddress} email - Email object to stringify
     * @returns {string} String representation of the email
     */
    static stringify(email) {
        if (!email.name) {
            return email.address;
        }

        const escapedName = email.name.replace(/"/g, '\\"');
        return `"${escapedName}" <${email.address}>`;
    }
};
