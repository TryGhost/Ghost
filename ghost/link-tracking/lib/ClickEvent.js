const ObjectID = require('bson-objectid').default;

module.exports = class ClickEvent {
    /** @type {ObjectID} */
    event_id;
    /** @type {string} */
    member_uuid;
    /** @type {ObjectID} */
    link_id;

    constructor(data) {
        if (!data.id) {
            this.event_id = new ObjectID();
        }

        if (typeof data.id === 'string') {
            this.event_id = ObjectID.createFromHexString(data.id);
        } else {
            this.event_id = data.id;
        }

        this.member_uuid = data.member_uuid;
        this.link_id = data.link_id;
    }
};
