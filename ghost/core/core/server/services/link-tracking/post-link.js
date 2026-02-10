const ObjectID = require('bson-objectid').default;

/**
 * Stores the connection between a LinkRedirect and a Post
 */
module.exports = class PostLink {
    /** @type {ObjectID} */
    post_id;
    /** @type {ObjectID} */
    link_id;

    /**
     * @param {object} data
     * @param {string|ObjectID} data.post_id
     * @param {string|ObjectID} data.link_id
     */
    constructor(data) {
        if (typeof data.post_id === 'string') {
            this.post_id = ObjectID.createFromHexString(data.post_id);
        } else {
            this.post_id = data.post_id;
        }
        if (typeof data.link_id === 'string') {
            this.link_id = ObjectID.createFromHexString(data.link_id);
        } else {
            this.link_id = data.link_id;
        }
    }
};
