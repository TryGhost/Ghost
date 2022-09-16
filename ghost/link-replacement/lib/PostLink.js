/**
 * @typedef {import('bson-objectid').default} ObjectID
 */

class PostLink {
    /** @type {ObjectID} */
    post_id;
    /** @type {ObjectID} */
    link_id;

    /**
     * @param {object} data
     * @param {ObjectID} data.post_id
     * @param {ObjectID} data.link_id
     */
    constructor(data) {
        this.post_id = data.post_id;
        this.link_id = data.link_id;
    }
}

module.exports = PostLink;
