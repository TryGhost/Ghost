type PostLike = {
    id: string;
    lexical: string;
    html: string;
    author_id: string;
    feature_image: string | null;
    feature_image_alt: string | null;
    feature_image_caption: string | null;
    title: string;
    custom_excerpt: string | null;
    reason: string;
    post_status: string;
}

type Revision = {
    post_id: string;
    lexical: string;
    author_id: string;
    feature_image: string | null;
    feature_image_alt: string | null;
    feature_image_caption: string | null;
    title: string;
    custom_excerpt: string | null;
    post_status: string;
    reason: string;
    created_at_ts: number;
}

type PostRevisionsDeps = {
    config: {
        max_revisions: number;
        revision_interval_ms: number;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any
}

type RevisionResult = {
    value: true;
    reason: string;
} | {
    value: false
}

export class PostRevisions {
    config: PostRevisionsDeps['config'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any;

    constructor(deps: PostRevisionsDeps) {
        this.config = deps.config;
        this.model = deps.model;
    }

    shouldGenerateRevision(current: PostLike, revisions: Revision[], options?: { isPublished?: boolean; forceRevision?: boolean; newStatus?: string; olderStatus?: string; }): RevisionResult {
        const latestRevision = revisions[revisions.length - 1];
        // If there's no revisions for this post, we should always save a revision
        if (revisions.length === 0) {
            return {value: true, reason: 'initial_revision'};
        }
        // check if the post has been unpublished
        const isUnpublished = options && options.newStatus === 'draft' && options.olderStatus === 'published';
        if (isUnpublished) {
            return {value: true, reason: 'unpublished'};
        }
        // check if the post has been published
        const isPublished = options && options.isPublished;
        if (isPublished) {
            return {value: true, reason: 'published'};
        }

        const forceRevision = options && options.forceRevision;
        const featuredImagedHasChanged = latestRevision.feature_image !== current.feature_image;
        const lexicalHasChanged = latestRevision.lexical !== current.lexical;
        const titleHasChanged = latestRevision.title !== current.title;
        const customExcerptHasChanged = latestRevision.custom_excerpt !== current.custom_excerpt;
        // CASE: we only want to save a revision if something has changed since the previous revision
        if (lexicalHasChanged || titleHasChanged || featuredImagedHasChanged || customExcerptHasChanged) {
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

    async getRevisions(current: PostLike, revisions: Revision[], options?: { isPublished?: boolean; forceRevision?: boolean; newStatus?: string; olderStatus?: string; }): Promise<Revision[]> {
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

    convertPostLikeToRevision(input: PostLike, offset = 0): Revision {
        return {
            post_id: input.id,
            lexical: input.lexical,
            created_at_ts: Date.now() - offset,
            author_id: input.author_id,
            feature_image: input.feature_image,
            feature_image_alt: input.feature_image_alt,
            feature_image_caption: input.feature_image_caption,
            title: input.title,
            custom_excerpt: input.custom_excerpt,
            reason: input.reason,
            post_status: input.post_status
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async removeAuthorFromRevisions(authorId: string, options: any): Promise<void> {
        const revisions = await this.model.findAll({
            filter: `author_id:'${authorId}'`,
            columns: ['id'],
            transacting: options.transacting
        });

        const revisionIds = revisions.toJSON()
            .map(({id}: {id: string}) => id);

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
