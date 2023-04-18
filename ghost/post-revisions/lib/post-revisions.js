/**
 * @typedef {object} PostLike
 * @property {string} id
 * @property {string} lexical
 * @property {string} html
 * @property {string} author_id
 * @property {string} title
 */

/**
 * @typedef {object} Revision
 * @property {string} post_id
 * @property {string} lexical
 * @property {number} created_at_ts
 * @property {string} author_id
 * @property {string} title
 */

class PostRevisions {
    /**
     * @param {object} deps
     * @param {object} deps.config
     * @param {number} deps.config.max_revisions
     */
    constructor(deps) {
        this.config = deps.config;
    }

    /**
     * @param {PostLike} previous
     * @param {PostLike} current
     * @param {Revision[]} revisions
     * @returns {boolean}
     */
    shouldGenerateRevision(previous, current, revisions) {
        if (!previous) {
            return false;
        }
        if (revisions.length === 0) {
            return true;
        }
        return previous.html !== current.html || previous.title !== current.title;
    }

    /**
     * @param {PostLike} previous
     * @param {PostLike} current
     * @param {Revision[]} revisions
     * @returns {Promise<Revision[]>}
     */
    async getRevisions(previous, current, revisions) {
        if (!this.shouldGenerateRevision(previous, current, revisions)) {
            return revisions;
        }

        const currentRevision = this.convertPostLikeToRevision(current);

        if (revisions.length === 0) {
            return [
                currentRevision
            ];
        }

        return [currentRevision, ...revisions].slice(0, this.config.max_revisions);
    }

    /**
     * @param {PostLike} input
     * @returns {Revision}
     */
    convertPostLikeToRevision(input, offset = 0) {
        return {
            post_id: input.id,
            lexical: input.lexical,
            created_at_ts: Date.now() - offset,
            author_id: input.author_id,
            title: input.title
        };
    }
}

module.exports = PostRevisions;
