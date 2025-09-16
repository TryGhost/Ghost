const crypto = require('crypto');
const settingsHelpers = require('../settings-helpers');
const urlUtils = require('../../../shared/url-utils');

/**
 * RSS URL Helper
 *
 * Generates authenticated RSS URLs for members using UUID + HMAC validation
 */

/**
 * Generate a member-specific RSS URL with authentication parameters
 *
 * @param {Object} member - The member object containing uuid
 * @param {String} path - Optional RSS path (defaults to '/rss/')
 * @returns {String} The authenticated RSS URL
 */
function generateMemberRSSUrl(member, path = '/rss/') {
    if (!member || !member.uuid) {
        return null;
    }

    // Generate HMAC key using member UUID
    const validationKey = settingsHelpers.getMembersValidationKey();

    // If no validation key is available (e.g., during testing), return null
    if (!validationKey) {
        return null;
    }

    const key = crypto.createHmac('sha256', validationKey)
        .update(member.uuid)
        .digest('hex');

    // Build the authenticated RSS URL
    const baseUrl = urlUtils.urlFor('home', true);
    const rssUrl = new URL(path, baseUrl);
    rssUrl.searchParams.set('uuid', member.uuid);
    rssUrl.searchParams.set('key', key);

    return rssUrl.toString();
}

/**
 * Generate RSS URLs for different feed types
 *
 * @param {Object} member - The member object
 * @returns {Object} Object containing different RSS URL types
 */
function generateMemberRSSUrls(member) {
    if (!member || !member.uuid) {
        return {};
    }

    return {
        main: generateMemberRSSUrl(member, '/rss/')
        // Additional feed types can be added here in the future
        // tag: (tagSlug) => generateMemberRSSUrl(member, `/tag/${tagSlug}/rss/`),
        // author: (authorSlug) => generateMemberRSSUrl(member, `/author/${authorSlug}/rss/`)
    };
}

module.exports = {
    generateMemberRSSUrl,
    generateMemberRSSUrls
};