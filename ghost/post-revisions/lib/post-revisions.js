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
     * @param {object} deps.model
     */
    constructor(deps) {
        this.config = deps.config;
        this.model = deps.model;
    }

    /**
     * @param {PostLike} previous
     * @param {PostLike} current
     * @param {Revision[]} revisions
     * @param {object} options
     * @returns {boolean}
     */
    shouldGenerateRevision(previous, current, revisions, options) {
        const latestRevision = revisions[revisions.length - 1];
        if (!previous) {
            return false;
        }
        // If there's no revisions for this post, we should always save a revision
        if (revisions.length === 0) {
            return true;
        }
        const isPublished = options && options.isPublished;
        if (isPublished) {
            return true;
        }

        const forceRevision = options && options.forceRevision;
        const lexicalHasChangedSinceLatestRevision = latestRevision.lexical !== current.lexical;
        const titleHasChanged = previous.title !== current.title;
        if ((lexicalHasChangedSinceLatestRevision || titleHasChanged) && forceRevision) {
            return true;
        }
        return false;
    }

    /**
     * @param {PostLike} previous
     * @param {PostLike} current
     * @param {Revision[]} revisions
     * @param {object} options
     * @returns {Promise<Revision[]>}
     */
    async getRevisions(previous, current, revisions, options) {
        if (!this.shouldGenerateRevision(previous, current, revisions, options)) {
            return revisions;
        }

        const currentRevision = this.convertPostLikeToRevision(current);

        if (revisions.length === 0) {
            return [
                currentRevision
            ];
        }

        // Grab the most recent revisions, limited by max_revisions
        const updatedRevisions = [...revisions, currentRevision];
        return updatedRevisions.slice(updatedRevisions.length - this.config.max_revisions, updatedRevisions.length);
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

    /**
     * @param {string} authorId
     * @param {object} options
     * @param {object} options.transacting
     */
    async removeAuthorFromRevisions(authorId, options) {
        const revisions = await this.model.findAll({
            filter: `author_id:${authorId}`,
            columns: ['id'],
            transacting: options.transacting
        });

        const revisionIds = revisions.toJSON()
            .map(({id}) => id);

        if (revisionIds.length === 0) {
            return;
        }

        await this.model.bulkEdit(revisionIds, 'post_revisions', {
            data: {
                author_id: null
            },
            column: 'id',
            transacting: options.transacting,
            throwErrors: true
        });
    }
}

module.exports = PostRevisions;
