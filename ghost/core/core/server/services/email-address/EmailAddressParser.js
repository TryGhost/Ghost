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

        /**
         * https://linear.app/ghost/issue/ONC-969
         *
         * Gmail will reject emails that contain certain Unicode characters.
         * There isn't a documented list of which characters, and the error
         * messages points us to https://support.google.com/mail/?p=BlockedMessage
         *
         * We've found that the following characters are problematic:
         * - ✅ WHITE HEAVY CHECK MARK (U+2705)
         * - ✓ CHECK MARK (U+2713)
         * - ✔ HEAVY CHECK MARK (U+2714)
         * - ☑ BALLOT BOX WITH CHECK (U+2611)
         * - 🗸 LIGHT CHECK MARK (U+1F5F8)
         *
         * We remove these characters from the name.
         */
        const nameCleanedForGmail = escapedName.replace(/[\u2705\u2713\u2714\u2611\u{1F5F8}]/gu, '').trim();
        return `"${nameCleanedForGmail}" <${email.address}>`;
    }
};
