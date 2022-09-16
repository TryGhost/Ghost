const ObjectID = require('bson-objectid').default;

module.exports = class ClickEvent {
    /** @type {ObjectID} */
    event_id;
    /** @type {ObjectID} */
    member_id;
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

        this.member_id = data.member_id;
        this.link_id = data.link_id;
    }
};
