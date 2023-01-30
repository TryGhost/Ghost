const ObjectID = require('bson-objectid').default;
const {ValidationError} = require('@tryghost/errors');
const MentionCreatedEvent = require('./MentionCreatedEvent');

module.exports = class Mention {
    /** @type {Array} */
    events = [];

    /** @type {ObjectID} */
    #id;
    get id() {
        return this.#id;
    }

    /** @type {URL} */
    #source;
    get source() {
        return this.#source;
    }

    /** @type {URL} */
    #target;
    get target() {
        return this.#target;
    }

    /** @type {Date} */
    #timestamp;
    get timestamp() {
        return this.#timestamp;
    }

    /** @type {Object<string, any> | null} */
    #payload;
    get payload() {
        return this.#payload;
    }

    /** @type {ObjectID | null} */
    #resourceId;
    get resourceId() {
        return this.#resourceId;
    }

    /** @type {string} */
    #sourceTitle;
    get sourceTitle() {
        return this.#sourceTitle;
    }

    /** @type {string | null} */
    #sourceSiteTitle;
    get sourceSiteTitle() {
        return this.#sourceSiteTitle;
    }

    /** @type {string | null} */
    #sourceAuthor;
    get sourceAuthor() {
        return this.#sourceAuthor;
    }

    /** @type {string | null} */
    #sourceExcerpt;
    get sourceExcerpt() {
        return this.#sourceExcerpt;
    }

    /** @type {URL | null} */
    #sourceFavicon;
    get sourceFavicon() {
        return this.#sourceFavicon;
    }

    /** @type {URL | null} */
    #sourceFeaturedImage;
    get sourceFeaturedImage() {
        return this.#sourceFeaturedImage;
    }

    toJSON() {
        return {
            id: this.id,
            source: this.source,
            target: this.target,
            timestamp: this.timestamp,
            payload: this.payload,
            resourceId: this.resourceId,
            sourceTitle: this.sourceTitle,
            sourceSiteTitle: this.sourceSiteTitle,
            sourceAuthor: this.sourceAuthor,
            sourceExcerpt: this.sourceExcerpt,
            sourceFavicon: this.sourceFavicon,
            sourceFeaturedImage: this.sourceFeaturedImage
        };
    }

    /** @private */
    constructor(data) {
        this.#id = data.id;
        this.#source = data.source;
        this.#target = data.target;
        this.#timestamp = data.timestamp;
        this.#payload = data.payload;
        this.#resourceId = data.resourceId;
        this.#sourceTitle = data.sourceTitle;
        this.#sourceSiteTitle = data.sourceSiteTitle;
        this.#sourceAuthor = data.sourceAuthor;
        this.#sourceExcerpt = data.sourceExcerpt;
        this.#sourceFavicon = data.sourceFavicon;
        this.#sourceFeaturedImage = data.sourceFeaturedImage;
    }

    /**
     * @param {any} data
     * @returns {Promise<Mention>}
     */
    static async create(data) {
        /** @type ObjectID */
        let id;
        let isNew = false;
        if (!data.id) {
            isNew = true;
            id = new ObjectID();
        } else if (typeof data.id === 'string') {
            id = ObjectID.createFromHexString(data.id);
        } else if (data.id instanceof ObjectID) {
            id = data.id;
        } else {
            throw new ValidationError({
                message: 'Invalid ID provided for Mention'
            });
        }

        /** @type URL */
        let source;
        if (data.source instanceof URL) {
            source = data.source;
        } else {
            source = new URL(data.source);
        }

        /** @type URL */
        let target;
        if (data.target instanceof URL) {
            target = data.target;
        } else {
            target = new URL(data.target);
        }

        /** @type Date */
        let timestamp;
        if (data.timestamp instanceof Date) {
            timestamp = data.timestamp;
        } else if (data.timestamp) {
            timestamp = new Date(data.timestamp);
            if (isNaN(timestamp.valueOf())) {
                throw new ValidationError({
                    message: 'Invalid Date'
                });
            }
        } else {
            timestamp = new Date();
        }

        let payload;
        payload = data.payload ? JSON.parse(JSON.stringify(data.payload)) : null;

        /** @type {ObjectID | null} */
        let resourceId = null;
        if (data.resourceId) {
            if (data.resourceId instanceof ObjectID) {
                resourceId = data.resourceId;
            } else {
                resourceId = ObjectID.createFromHexString(data.resourceId);
            }
        }

        /** @type {string} */
        let sourceTitle = validateString(data.sourceTitle, 2000, 'sourceTitle');
        if (sourceTitle === null) {
            sourceTitle = source.host;
        }
        /** @type {string | null} */
        const sourceExcerpt = validateString(data.sourceExcerpt, 2000, 'sourceExcerpt');
        /** @type {string | null} */
        const sourceSiteTitle = validateString(data.sourceSiteTitle, 2000, 'sourceSiteTitle');
        /** @type {string | null} */
        const sourceAuthor = validateString(data.sourceAuthor, 2000, 'sourceAuthor');

        /** @type {URL | null} */
        let sourceFavicon = null;
        if (data.sourceFavicon instanceof URL) {
            sourceFavicon = data.sourceFavicon;
        } else if (data.sourceFavicon) {
            sourceFavicon = new URL(data.sourceFavicon);
        }

        /** @type {URL | null} */
        let sourceFeaturedImage = null;
        if (data.sourceFeaturedImage instanceof URL) {
            sourceFeaturedImage = data.sourceFeaturedImage;
        } else if (data.sourceFeaturedImage) {
            sourceFeaturedImage = new URL(data.sourceFeaturedImage);
        }

        const mention = new Mention({
            id,
            source,
            target,
            timestamp,
            payload,
            resourceId,
            sourceTitle,
            sourceSiteTitle,
            sourceAuthor,
            sourceExcerpt,
            sourceFavicon,
            sourceFeaturedImage
        });

        if (isNew) {
            mention.events.push(MentionCreatedEvent.create({mention}));
        }
        return mention;
    }
};

function validateString(value, maxlength, name) {
    if (!value) {
        return null;
    }

    if (typeof value !== 'string') {
        throw new ValidationError({
            message: `${name} must be a string`
        });
    }

    return value.trim().slice(0, maxlength);
}
