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

    /** @type {boolean} */
    #verified = false;
    get verified() {
        return this.#verified;
    }

    /** @type {boolean} */
    #deleted = false;

    get deleted() {
        return this.#deleted;
    }

    delete() {
        this.#deleted = true;
    }

    #undelete() {
        // When an earlier mention is deleted, but then it gets verified again, we need to undelete it
        if (this.#deleted) {
            this.#deleted = false;
            this.events.push(MentionCreatedEvent.create({mention: this}));
        }
    }

    /**
     * @param {string} html
     * @param {string} contentType
     */
    verify(html, contentType) {
        const wasVerified = this.#verified;

        if (contentType.includes('text/html')) {
            try {
                const cheerio = require('cheerio');
                const $ = cheerio.load(html);
                const hasTargetUrl = $('a[href*="' + this.target.href + '"], img[src*="' + this.target.href + '"], video[src*="' + this.target.href + '"]').length > 0;
                this.#verified = hasTargetUrl;

                if (wasVerified && !this.#verified) {
                    // Delete the mention, but keep it verified (it was just deleted, because it was verified earlier, so now it is removed from the site according to the spec)
                    this.#deleted = true;
                    this.#verified = true;
                } else {
                    this.#undelete();
                }
            } catch (e) {
                this.#verified = false;
            }
        }

        if (contentType.includes('application/json')) {
            try {
                // Check valid JSON
                JSON.parse(html);

                // Check full text string is present in the json
                this.#verified = !!html.includes(JSON.stringify(this.target.href));

                if (wasVerified && !this.#verified) {
                    // Delete the mention, but keep it verified (it was just deleted, because it was verified earlier, so now it is removed from the site according to the spec)
                    this.#deleted = true;
                    this.#verified = true;
                } else {
                    this.#undelete();
                }
            } catch (e) {
                this.#verified = false;
            }
        }
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

    /** @type {string | null} */
    #resourceType;
    get resourceType() {
        return this.#resourceType;
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

    /**
     * @param {object} metadata
     */
    setSourceMetadata(metadata) {
        /** @type {string} */
        let sourceTitle = validateString(metadata.sourceTitle, 2000, 'sourceTitle');
        if (sourceTitle === null) {
            sourceTitle = this.#source.host;
        }
        /** @type {string | null} */
        const sourceExcerpt = validateString(metadata.sourceExcerpt, 2000, 'sourceExcerpt');
        /** @type {string | null} */
        let sourceSiteTitle = validateString(metadata.sourceSiteTitle, 2000, 'sourceSiteTitle');
        if (sourceSiteTitle === null) {
            sourceSiteTitle = this.#source.host;
        }

        /** @type {string | null} */
        const sourceAuthor = validateString(metadata.sourceAuthor, 2000, 'sourceAuthor');

        /** @type {URL | null} */
        let sourceFavicon = null;
        if (metadata.sourceFavicon instanceof URL) {
            sourceFavicon = metadata.sourceFavicon;
        } else if (metadata.sourceFavicon) {
            sourceFavicon = new URL(metadata.sourceFavicon);
        }

        /** @type {URL | null} */
        let sourceFeaturedImage = null;
        if (metadata.sourceFeaturedImage instanceof URL) {
            sourceFeaturedImage = metadata.sourceFeaturedImage;
        } else if (metadata.sourceFeaturedImage) {
            sourceFeaturedImage = new URL(metadata.sourceFeaturedImage);
        }

        this.#sourceTitle = sourceTitle;
        this.#sourceExcerpt = sourceExcerpt;
        this.#sourceSiteTitle = sourceSiteTitle;
        this.#sourceAuthor = sourceAuthor;
        this.#sourceFavicon = sourceFavicon;
        this.#sourceFeaturedImage = sourceFeaturedImage;
    }

    toJSON() {
        return {
            id: this.id,
            source: this.source,
            target: this.target,
            timestamp: this.timestamp,
            payload: this.payload,
            resourceId: this.resourceId,
            resourceType: this.resourceType,
            sourceTitle: this.sourceTitle,
            sourceSiteTitle: this.sourceSiteTitle,
            sourceAuthor: this.sourceAuthor,
            sourceExcerpt: this.sourceExcerpt,
            sourceFavicon: this.sourceFavicon,
            sourceFeaturedImage: this.sourceFeaturedImage,
            verified: this.verified
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
        this.#resourceType = data.resourceType;
        this.#verified = data.verified;
        this.#deleted = data.deleted || false;
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

        /** @type boolean */
        let verified;
        verified = isNew ? false : !!data.verified;

        /** @type {ObjectID | null} */
        let resourceId = null;
        if (data.resourceId) {
            if (data.resourceId instanceof ObjectID) {
                resourceId = data.resourceId;
            } else {
                resourceId = ObjectID.createFromHexString(data.resourceId);
            }
        }

        /** @type {string | null} */
        let resourceType = null;
        if (data.resourceType) {
            resourceType = data.resourceType;
        }

        const mention = new Mention({
            id,
            source,
            target,
            timestamp,
            payload,
            resourceId,
            resourceType,
            verified,
            deleted: isNew ? false : !!data.deleted
        });

        mention.setSourceMetadata(data);

        if (isNew) {
            mention.events.push(MentionCreatedEvent.create({mention}));
        }
        return mention;
    }

    /**
     * @returns {boolean}
     */
    isDeleted() {
        return this.#deleted;
    }

    /**
     * @param {Mention} mention
     * @returns {boolean}
     */
    static isDeleted(mention) {
        return mention.isDeleted();
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
