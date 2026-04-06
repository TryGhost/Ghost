const nql = require('@tryghost/nql');
const {BadRequestError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const ObjectId = require('bson-objectid').default;
const pick = require('lodash/pick');
const DomainEvents = require('@tryghost/domain-events');
const PostEmailHandler = require('./post-email-handler');

const messages = {
    invalidVisibilityFilter: 'Invalid visibility filter.',
    invalidVisibility: 'Invalid visibility value.',
    invalidTiers: 'Invalid tiers value.',
    invalidTags: 'Invalid tags value.',
    unsupportedBulkAction: 'Unsupported bulk action',
    postNotFound: 'Post not found.'
};

class PostsService {
    constructor({urlUtils, models, isSet, stats, emailService, postsExporter}) {
        this.urlUtils = urlUtils;
        this.models = models;
        this.isSet = isSet;
        this.stats = stats;
        this.emailService = emailService;
        this.postsExporter = postsExporter;
        this.postEmailHandler = new PostEmailHandler({models, emailService});
    }

    /**
     *
     * @param {Object} options - frame options
     * @returns {Promise<Object>}
     */
    async browsePosts(options) {
        const posts = await this.models.Post.findPage(options);
        return posts;
    }

    async readPost(frame) {
        const model = await this.models.Post.findOne(frame.data, frame.options);

        if (!model) {
            throw new errors.NotFoundError({
                message: tpl(messages.postNotFound)
            });
        }

        return model.toJSON(frame.options);
    }

    /**
     * @typedef {'published_updated' | 'scheduled_updated' | 'draft_updated' | 'unpublished'} EventString
     */

    /**
     *
     * @param {import('@tryghost/api-framework').Frame} frame
     * @param {object} [options]
     * @param {(event: EventString, dto: any) => Promise<void> | void} [options.eventHandler] - Called before the editPost method resolves with an event string
     * @returns
     */
    async editPost(frame, options) {
        await this.postEmailHandler.validateBeforeSave(frame);

        const model = await this.models.Post.edit(frame.data.posts[0], frame.options);

        await this.postEmailHandler.createOrRetryEmail(model);

        const dto = model.toJSON(frame.options);

        if (typeof options?.eventHandler === 'function') {
            await options.eventHandler(this.getChanges(model), dto);
        }

        return dto;
    }

    /**
     * @param {any} model
     * @returns {EventString}
     */
    getChanges(model) {
        if (model.get('status') === 'published' && model.wasChanged()) {
            return 'published_updated';
        }

        if (model.get('status') === 'draft' && model.previous('status') === 'published') {
            return 'unpublished';
        }

        if (model.get('status') === 'draft' && model.previous('status') !== 'published') {
            return 'draft_updated';
        }

        if (model.get('status') === 'scheduled' && model.wasChanged()) {
            return 'scheduled_updated';
        }
    }

    #mergeFilters(...filters) {
        return filters.filter(filter => filter).map(f => `(${f})`).join('+');
    }

    async bulkEdit(data, options) {
        const {
            PostsBulkAddTagsEvent,
            PostsBulkUnpublishedEvent,
            PostsBulkFeaturedEvent,
            PostsBulkUnfeaturedEvent,
            PostsBulkUnscheduledEvent
        } = require('../../../shared/events-ts');

        if (data.action === 'unpublish') {
            const updateResult = await this.#updatePosts({status: 'draft'}, {filter: this.#mergeFilters('status:published', options.filter), context: options.context, actionName: 'unpublished'});
            DomainEvents.dispatch(PostsBulkUnpublishedEvent.create(updateResult.editIds));

            return updateResult;
        }
        if (data.action === 'unschedule') {
            const updateResult = await this.#updatePosts({status: 'draft', published_at: null}, {filter: this.#mergeFilters('status:scheduled', options.filter), context: options.context, actionName: 'unscheduled'});
            // makes sure `email_only` value is reverted for the unscheduled posts
            await this.models.Post.bulkEdit(updateResult.editIds, 'posts_meta', {
                data: {email_only: false},
                column: 'post_id',
                transacting: options.transacting,
                throwErrors: true
            });
            DomainEvents.dispatch(PostsBulkUnscheduledEvent.create(updateResult.editIds));

            return updateResult;
        }
        if (data.action === 'feature') {
            const updateResult = await this.#updatePosts({featured: true}, {filter: options.filter, context: options.context, actionName: 'featured'});
            DomainEvents.dispatch(PostsBulkFeaturedEvent.create(updateResult.editIds));

            return updateResult;
        }
        if (data.action === 'unfeature') {
            const updateResult = await this.#updatePosts({featured: false}, {filter: options.filter, context: options.context, actionName: 'unfeatured'});
            DomainEvents.dispatch(PostsBulkUnfeaturedEvent.create(updateResult.editIds));

            return updateResult;
        }
        if (data.action === 'access') {
            if (!['public', 'members', 'paid', 'tiers'].includes(data.meta.visibility)) {
                throw new errors.IncorrectUsageError({
                    message: tpl(messages.invalidVisibility)
                });
            }
            let tiers = undefined;
            if (data.meta.visibility === 'tiers') {
                if (!Array.isArray(data.meta.tiers)) {
                    throw new errors.IncorrectUsageError({
                        message: tpl(messages.invalidTiers)
                    });
                }
                tiers = data.meta.tiers;
            }
            return await this.#updatePosts({visibility: data.meta.visibility, tiers}, {filter: options.filter, context: options.context});
        }
        if (data.action === 'addTag') {
            if (!Array.isArray(data.meta.tags)) {
                throw new errors.IncorrectUsageError({
                    message: tpl(messages.invalidTags)
                });
            }
            for (const tag of data.meta.tags) {
                if (typeof tag !== 'object') {
                    throw new errors.IncorrectUsageError({
                        message: tpl(messages.invalidTags)
                    });
                }
                if (!tag.id && !tag.name) {
                    throw new errors.IncorrectUsageError({
                        message: tpl(messages.invalidTags)
                    });
                }
            }

            const bulkResult = await this.#bulkAddTags({tags: data.meta.tags}, {filter: options.filter, context: options.context});
            DomainEvents.dispatch(PostsBulkAddTagsEvent.create(bulkResult.editIds));

            return bulkResult;
        }
        throw new errors.IncorrectUsageError({
            message: tpl(messages.unsupportedBulkAction)
        });
    }

    /**
     * @param {object} data
     * @param {string[]} data.tags - Array of tag ids to add to the post
     * @param {object} options
     * @param {string} options.filter - An NQL Filter
     * @param {object} options.context
     * @param {object} [options.transacting]
     * @returns {Promise<{successful: number, unsuccessful: number, editIds: string[]}>}
     */
    async #bulkAddTags(data, options) {
        if (!options.transacting) {
            return await this.models.Post.transaction(async (transacting) => {
                return await this.#bulkAddTags(data, {
                    ...options,
                    transacting
                });
            });
        }

        // Create tags that don't exist
        for (const tag of data.tags) {
            if (!tag.id) {
                const createdTag = await this.models.Tag.add(tag, {transacting: options.transacting, context: options.context});
                tag.id = createdTag.id;
            }
        }

        const postRows = await this.models.Post.getFilteredCollectionQuery({
            filter: options.filter,
            status: 'all',
            transacting: options.transacting
        }).select('posts.id');

        const postTags = data.tags.reduce((pt, tag) => {
            return pt.concat(postRows.map((post) => {
                return {
                    id: (new ObjectId()).toHexString(),
                    post_id: post.id,
                    tag_id: tag.id,
                    sort_order: 0
                };
            }));
        }, []);

        await options.transacting('posts_tags').insert(postTags);
        await this.models.Post.addActions('edited', postRows.map(p => p.id), options);

        return {
            editIds: postRows.map(p => p.id),
            successful: postRows.length,
            unsuccessful: 0
        };
    }

    /**
     *
     * @param {Object} options
     * @returns Promise<{successful: number, unsuccessful: number, deleteIds: string[]}>
     */
    async #bulkDestroy(options) {
        if (!options.transacting) {
            return await this.models.Post.transaction(async (transacting) => {
                return await this.#bulkDestroy({
                    ...options,
                    transacting
                });
            });
        }

        const postRows = await this.models.Post.getFilteredCollectionQuery({
            filter: options.filter,
            status: 'all',
            transacting: options.transacting
        }).leftJoin('emails', 'posts.id', 'emails.post_id').select('posts.id', 'emails.id as email_id');
        const deleteIds = postRows.map(row => row.id);

        // We also need to collect the email ids because the email relation doesn't have cascase, and we need to delete the related relations of the post
        const deleteEmailIds = postRows.map(row => row.email_id).filter(id => !!id);

        const postTablesToDelete = [
            'posts_authors',
            'posts_tags',
            'posts_meta',
            'mobiledoc_revisions',
            'post_revisions',
            'posts_products'
        ];
        const emailTablesToDelete = [
            'email_recipient_failures',
            'email_recipients',
            'email_batches',
            'email_spam_complaint_events'
        ];

        // Don't clear, but set relation to null
        const emailTablesToSetNull = [
            'suppressions'
        ];

        for (const table of postTablesToDelete) {
            await this.models.Post.bulkDestroy(deleteIds, table, {
                column: 'post_id',
                transacting: options.transacting,
                throwErrors: true
            });
        }

        for (const table of emailTablesToDelete) {
            await this.models.Post.bulkDestroy(deleteEmailIds, table, {
                column: 'email_id',
                transacting: options.transacting,
                throwErrors: true
            });
        }

        for (const table of emailTablesToSetNull) {
            await this.models.Post.bulkEdit(deleteEmailIds, table, {
                data: {email_id: null},
                column: 'email_id',
                transacting: options.transacting,
                throwErrors: true
            });
        }

        // Posts and emails
        await this.models.Post.bulkDestroy(deleteEmailIds, 'emails', {transacting: options.transacting, throwErrors: true});
        const result = await this.models.Post.bulkDestroy(deleteIds, 'posts', {...options, throwErrors: true});

        result.deleteIds = deleteIds;

        return result;
    }

    async bulkDestroy(options) {
        const result = await this.#bulkDestroy(options);
        const {PostsBulkDestroyedEvent} = require('../../../shared/events-ts');
        DomainEvents.dispatch(PostsBulkDestroyedEvent.create(result.deleteIds));

        return result;
    }

    async export(frame) {
        return await this.postsExporter.export(frame.options);
    }

    async #updatePosts(data, options) {
        if (!options.transacting) {
            return await this.models.Post.transaction(async (transacting) => {
                return await this.#updatePosts(data, {
                    ...options,
                    transacting
                });
            });
        }

        const postRows = await this.models.Post.getFilteredCollectionQuery({
            filter: options.filter,
            status: 'all',
            transacting: options.transacting
        }).select('posts.id');

        const editIds = postRows.map(row => row.id);

        let tiers = undefined;
        if (data.tiers) {
            tiers = data.tiers;
            delete data.tiers;
        }

        const result = await this.models.Post.bulkEdit(editIds, 'posts', {
            ...options,
            data,
            throwErrors: true
        });

        // Update tiers
        if (tiers) {
            // First delete all
            await this.models.Post.bulkDestroy(editIds, 'posts_products', {
                column: 'post_id',
                transacting: options.transacting,
                throwErrors: true
            });

            // Then add again
            const toInsert = [];
            for (const postId of editIds) {
                for (const [index, tier] of tiers.entries()) {
                    if (typeof tier.id === 'string') {
                        toInsert.push({
                            id: ObjectId().toHexString(),
                            post_id: postId,
                            product_id: tier.id,
                            sort_order: index
                        });
                    }
                }
            }
            await this.models.Post.bulkAdd(toInsert, 'posts_products', {
                transacting: options.transacting,
                throwErrors: true
            });
        }

        result.editIds = editIds;

        return result;
    }

    async getProductsFromVisibilityFilter(visibilityFilter) {
        try {
            const allProducts = await this.models.Product.findAll();
            const visibilityFilterJson = nql(visibilityFilter).toJSON();
            const productsData = (visibilityFilterJson.product ? [visibilityFilterJson] : visibilityFilterJson.$or) || [];
            const tiers = productsData
                .map((data) => {
                    return allProducts.find((p) => {
                        return p.get('slug') === data.product;
                    });
                }).filter(p => !!p).map((d) => {
                    return d.toJSON();
                });
            return tiers;
        } catch (err) {
            return Promise.reject(new BadRequestError({
                message: tpl(messages.invalidVisibilityFilter),
                context: err.message
            }));
        }
    }

    handleCacheInvalidation(model) {
        let cacheInvalidate;

        if (
            model.get('status') === 'published' && model.wasChanged() ||
            model.get('status') === 'draft' && model.previous('status') === 'published'
        ) {
            cacheInvalidate = true;
        } else if (
            model.get('status') === 'draft' && model.previous('status') !== 'published' ||
            model.get('status') === 'scheduled' && model.wasChanged()
        ) {
            const baseUrl = this.urlUtils.urlJoin('/p', model.get('uuid'), '/');
            cacheInvalidate = {
                value: [
                    baseUrl,
                    `${baseUrl}?member_status=anonymous`,
                    `${baseUrl}?member_status=free`,
                    `${baseUrl}?member_status=paid`
                ].join(', ')
            };
        } else {
            cacheInvalidate = false;
        }

        return cacheInvalidate;
    }

    async copyPost(frame) {
        const existingPost = await this.models.Post.findOne({
            id: frame.options.id,
            status: 'all'
        }, frame.options);

        const newPostData = pick(
            existingPost.attributes,
            [
                'title',
                'mobiledoc',
                'lexical',
                'html',
                'plaintext',
                'feature_image',
                'featured',
                'type',
                'locale',
                'visibility',
                'email_recipient_filter',
                'custom_excerpt',
                'codeinjection_head',
                'codeinjection_foot',
                'custom_template'
            ]
        );

        newPostData.title = `${existingPost.attributes.title} (Copy)`;
        newPostData.status = 'draft';
        newPostData.authors = existingPost.related('authors')
            .map(author => ({id: author.get('id')}));
        newPostData.tags = existingPost.related('tags')
            .map(tag => ({id: tag.get('id')}));

        const existingPostMeta = existingPost.related('posts_meta');

        if (existingPostMeta.isNew() === false) {
            newPostData.posts_meta = pick(
                existingPostMeta.attributes,
                [
                    'og_image',
                    'og_title',
                    'og_description',
                    'twitter_image',
                    'twitter_title',
                    'twitter_description',
                    'meta_title',
                    'meta_description',
                    'frontmatter',
                    'feature_image_alt',
                    'feature_image_caption',
                    'hide_title_and_feature_image'
                ]
            );
        }

        const existingPostTiers = existingPost.related('tiers');

        if (existingPostTiers.length > 0) {
            newPostData.tiers = existingPostTiers.map(tier => ({id: tier.get('id')}));
        }

        return this.models.Post.add(newPostData, frame.options);
    }

    /**
     * Generates a location url for a copied post based on the original url generated by the API framework
     *
     * @param {string} url
     * @returns {string}
     */
    generateCopiedPostLocationFromUrl(url) {
        const urlParts = url.split('/');
        const pageId = urlParts[urlParts.length - 2];

        return urlParts
            .slice(0, -4)
            .concat(pageId)
            .concat('')
            .join('/');
    }
}

module.exports = PostsService;
