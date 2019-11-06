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
     * @param {[object]} recipientData - list of data keyed by email to inject into the email
     * @returns {Promise<boolean>} A promise representing the success of the email sending
     */
    async send(message, recipients, recipientData) {
        for (const recipient of recipients) {
            const messageToSend = Object.assign({}, message, {
                to: recipient
            });
            const unsubscribeUrl = recipientData[recipient].unsubscribe_url;
            messageToSend.html = messageToSend.html.replace('%recipient.unsubscribe_url%', unsubscribeUrl);
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
