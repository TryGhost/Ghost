/**
 * @typedef {object} PostLike
 * @property {string} id
 * @property {string} lexical
 * @property {string} html
 * @property {string} author_id
 * @property {string} feature_image
 * @property {string} feature_image_alt
 * @property {string} feature_image_caption
 * @property {string} title
 * @property {string} reason
 * @property {string} post_status
 */

/**
 * @typedef {object} Revision
 * @property {string} post_id
 * @property {string} lexical
 * @property {number} created_at_ts
 * @property {string} author_id
 * @property {string} feature_image
 * @property {string} feature_image_alt
 * @property {string} feature_image_caption
 * @property {string} title
 * @property {string} reason
 * @property {string} post_status
 */

class PostRevisions {
    /**
     * @param {object} deps
     * @param {object} deps.config
     * @param {number} deps.config.max_revisions
     * @param {number} deps.config.revision_interval_ms
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
     * @returns {object}
     */
    shouldGenerateRevision(current, revisions, options) {
        const latestRevision = revisions[revisions.length - 1];
        // If there's no revisions for this post, we should always save a revision
        if (revisions.length === 0) {
            return {value: true, reason: 'initial_revision'};
        }
        const isPublished = options && options.isPublished;
        if (isPublished) {
            return {value: true, reason: 'published'};
        }

        const forceRevision = options && options.forceRevision;
        const featuredImagedHasChanged = latestRevision.feature_image !== current.feature_image;
        const lexicalHasChanged = latestRevision.lexical !== current.lexical;
        const titleHasChanged = latestRevision.title !== current.title;
        // CASE: we only want to save a revision if something has changed since the previous revision
        if (lexicalHasChanged || titleHasChanged || featuredImagedHasChanged) {
            // CASE: user has explicitly requested a revision by hitting cmd+s or leaving the editor
            if (forceRevision) {
                return {value: true, reason: 'explicit_save'};
            }
            // CASE: it's been X mins since the last revision, so we should save a new one
            if ((Date.now() - latestRevision.created_at_ts) > this.config.revision_interval_ms) {
                return {value: true, reason: 'background_save'};
            }
        }
        return {value: false};
    }

    /**
     * @param {PostLike} previous
     * @param {PostLike} current
     * @param {Revision[]} revisions
     * @param {object} options
     * @returns {Promise<Revision[]>}
     */
    async getRevisions(current, revisions, options) {
        const shouldGenerateRevision = this.shouldGenerateRevision(current, revisions, options);
        if (!shouldGenerateRevision.value) {
            return revisions;
        }

        const currentRevision = this.convertPostLikeToRevision(current);
        currentRevision.reason = shouldGenerateRevision.reason;

        if (revisions.length === 0) {
            return [
                currentRevision
            ];
        }

        // Grab the most recent revisions, limited by max_revisions
        const updatedRevisions = [...revisions, currentRevision];
        if (updatedRevisions.length > this.config.max_revisions) {
            return updatedRevisions.slice(updatedRevisions.length - this.config.max_revisions, updatedRevisions.length);
        } else {
            return updatedRevisions;
        }
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
            feature_image: input.feature_image,
            feature_image_alt: input.feature_image_alt,
            feature_image_caption: input.feature_image_caption,
            title: input.title,
            post_status: input.post_status
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
