const ObjectID = require('bson-objectid').default;

/**
 * @typedef {Object} FullPostLinkCount
 * @property {number} clicks
 */

/**
 * Stores the connection between a LinkRedirect and a Post
 */
module.exports = class FullPostLink {
    /** @type {ObjectID} */
    post_id;
    
    /** @type {import('@tryghost/link-redirects/lib/LinkRedirect')} */
    link;

    /** @type {FullPostLinkCount} */
    count;

    /**
     * @param {object} data
     * @param {string|ObjectID} data.post_id
     * @param {import('@tryghost/link-redirects/lib/LinkRedirect')} data.link
     * @param {FullPostLinkCount} data.count
     */
    constructor(data) {
        if (typeof data.post_id === 'string') {
            this.post_id = ObjectID.createFromHexString(data.post_id);
        } else {
            this.post_id = data.post_id;
        }
        this.link = data.link;
        this.count = data.count;
    }
};
