/* eslint-disable no-unused-vars */

/**
 * @typedef {string|null} Segment
 * @typedef {object} Post
 * @typedef {object} Newsletter
 */

/**
 * @typedef {object} MemberLike
 * @prop {string} id
 * @prop {string} uuid
 * @prop {string} email
 * @prop {string} name
 */

/**
 * @typedef {object} ReplacementDefinition
 * @prop {string} token
 * @prop {(member: MemberLike) => string} getValue
 */

/**
 * @typedef {object} EmailRenderOptions
 * @prop {boolean} clickTrackingEnabled
 */

/**
 * @typedef {object} EmailBody
 * @prop {string} html
 * @prop {string} plaintext
 * @prop {ReplacementDefinition[]} replacements
 */

class EmailRenderer {
    /**
		Not sure about this, but we need a method that can tell us which member segments are needed for a given post/email.
        @param {Post} post
        @param {Newsletter} newsletter
        @returns {Promise<Segment[]>}
	*/
    async getSegments(post, newsletter) {
        return [null];
    }

    /**
     * 
     * @param {Post} post 
     * @param {Newsletter} newsletter 
     * @param {Segment} segment 
     * @param {EmailRenderOptions} options 
     * @returns {Promise<EmailBody>}
     */
    async renderBody(post, newsletter, segment, options) {
        return {
            html: 'HTML',
            plaintext: 'Plaintext',
            replacements: []
        };
    }

    getSubject(post, newsletter) {
        return 'Subject';
    }

    getFromAddress(post, newsletter) {
        return 'noreply@example.com'; // TODO
    }

    /**
     * @param {Post} post
     * @param {Newsletter} newsletter
     * @returns {string|null}
     */
    getReplyToAddress(post, newsletter) {
        return 'noreply@example.com'; // TODO
    }
}

module.exports = EmailRenderer;
