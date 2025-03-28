const ObjectID = require('bson-objectid').default;

module.exports = class LinkRedirect {
    /** @type {ObjectID} */
    link_id;
    /** @type {URL} */
    from;
    /** @type {URL} */
    to;
    /** @type {boolean} */
    edited;

    constructor(data) {
        if (!data.id) {
            this.link_id = new ObjectID();
        }

        if (typeof data.id === 'string') {
            this.link_id = ObjectID.createFromHexString(data.id);
        }

        this.from = data.from;
        this.to = data.to;
        this.edited = !!data.edited;
    }
};
