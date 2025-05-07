/**
 * This is a cache provider that lives very short in memory, there is no need for persistence.
 * It is created when scheduling an email in the batch sending service, and is then passed to the sending service. The sending service
 * can optionally use a passed cache provider to reuse the email body for each batch with the same segment.
 */
class EmailBodyCache {
    constructor() {
        this.cache = new Map();
    }

    get(key) {
        return this.cache.get(key) ?? null;
    }

    set(key, value) {
        this.cache.set(key, value);
    }
}

module.exports = EmailBodyCache;
