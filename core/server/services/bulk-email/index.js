// @ts-check
const mailService = require('../mail');
const ghostMailer = new mailService.GhostMailer();
const common = require('../../lib/common');

/**
 * An email address
 * @typedef { string } EmailAddress
 */

/**
 * An object representing an email to send
 * @typedef { Object } Email
 * @property { string } html - The html content of the email
 * @property { string } subject - The subject of the email
 */

module.exports = {
    /**
     * @param {Email} message - The message to send
     * @param {[EmailAddress]} recipients - the recipients to send the email to
     * @returns {Promise<boolean>} A promise representing the success of the email sending
     */
    async send(message, recipients) {
        for (const recipient of recipients) {
            const messageToSend = Object.assign({}, message, {
                to: recipient
            });
            try {
                await ghostMailer.send(messageToSend);
            } catch (err) {
                // @TODO log this somewhere with state?
                common.logging.warn(`Oh no! an email failed to send :( ${recipient}`);
            }
        }
        return true;
    }
};
