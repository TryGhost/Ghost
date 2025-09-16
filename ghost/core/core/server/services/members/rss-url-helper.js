const crypto = require('crypto');
const settingsHelpers = require('../settings-helpers');
const urlUtils = require('../../../shared/url-utils');

module.exports = {
    generateMemberRSSUrl(member, path = '/rss/') {
        if (!member || !member.uuid) {
            return '';
        }

        const validationKey = settingsHelpers.getMembersValidationKey();
        const key = crypto.createHmac('sha256', validationKey)
            .update(member.uuid)
            .digest('hex');

        const baseUrl = urlUtils.urlFor('home', true);
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        const fullUrl = urlUtils.urlJoin(baseUrl, cleanPath);
        return `${fullUrl}?uuid=${member.uuid}&key=${key}`;
    }
};