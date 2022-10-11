const ObjectID = require('bson-objectid').default;

module.exports = class Feedback {
    /** @type {ObjectID} */
    id;
    /** @type {number} */
    score;
    /** @type {ObjectID} */
    memberId;
    /** @type {ObjectID} */
    postId;

    constructor(data) {
        if (!data.id) {
            this.id = new ObjectID();
        }

        if (typeof data.id === 'string') {
            this.id = ObjectID.createFromHexString(data.id);
        }

        this.score = data.score ?? 0;
        if (typeof data.memberId === 'string') {
            this.memberId = ObjectID.createFromHexString(data.memberId);
        } else {
            this.memberId = data.memberId;
        }

        if (typeof data.postId === 'string') {
            this.postId = ObjectID.createFromHexString(data.postId);
        } else {
            this.postId = data.postId;
        }
    }
};
