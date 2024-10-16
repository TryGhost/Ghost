// # Post Model
const _ = require('lodash');
const crypto = require('crypto');
const moment = require('moment');
const {sequence} = require('@tryghost/promise');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const nql = require('@tryghost/nql');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const ghostBookshelf = require('./base');
const config = require('../../shared/config');
const settingsCache = require('../../shared/settings-cache');
const limitService = require('../services/limits');
const mobiledocLib = require('../lib/mobiledoc');
const lexicalLib = require('../lib/lexical');
const relations = require('./relations');
const urlUtils = require('../../shared/url-utils');
const {Tag} = require('./tag');
const {Newsletter} = require('./newsletter');
const {BadRequestError} = require('@tryghost/errors');
const {PostRevisions} = require('@tryghost/post-revisions');
const {mobiledocToLexical} = require('@tryghost/kg-converters');
const labs = require('../../shared/labs');

const messages = {
    isAlreadyPublished: 'Your post is already published, please reload your page.',
    valueCannotBeBlank: 'Value in {key} cannot be blank.',
    expectedPublishedAtInFuture: 'Date must be at least {cannotScheduleAPostBeforeInMinutes} minutes in the future.',
    untitled: '(Untitled)',
    notEnoughPermission: 'You do not have permission to perform this action',
    invalidNewsletter: 'The newsletter parameter doesn\'t match any active newsletter.',
    invalidMobiledocStructure: 'Invalid mobiledoc structure.',
    invalidMobiledocStructureHelp: 'https://ghost.org/docs/publishing/',
    invalidLexicalStructure: 'Invalid lexical structure.',
    invalidLexicalStructureHelp: 'https://ghost.org/docs/publishing/'
};

const MOBILEDOC_REVISIONS_COUNT = 10;
const POST_REVISIONS_COUNT = 25;
const POST_REVISIONS_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ALL_STATUSES = ['published', 'draft', 'scheduled', 'sent'];

let Post;
let Posts;

Post = ghostBookshelf.Model.extend({

    tableName: 'posts',

    actionsCollectCRUD: true,
    actionsResourceType: 'post',
    actionsExtraContext: ['type'],

    /**
     * @NOTE
     *
     * We define the defaults on the schema (db) and model level.
     *
     * Why?
     *   - when you insert a resource, Knex does only return the id of the created resource
     *     - see https://knexjs.org/#Builder-insert
     *   - that means `defaultTo` is a pure database configuration (!)
     *   - Bookshelf just returns the model values which you have asked Bookshelf to insert
     *      - it can't return the `defaultTo` value from the schema/db level
     *      - but the db defaults defined in the schema are saved in the database correctly
     *   - `models.Post.add` always does to operations:
     *      1. add
     *      2. fetch (this ensures we fetch the whole resource from the database)
     *   - that means we have to apply the defaults on the model layer to ensure a complete field set
     *      1. any connected logic in our model hooks e.g. beforeSave
     *      2. model events e.g. "post.published" are using the inserted resource, not the fetched resource
     */
    defaults: function defaults() {
        let visibility = 'public';
        let tiers = [];
        const defaultContentVisibility = settingsCache.get('default_content_visibility');
        if (defaultContentVisibility) {
            if (defaultContentVisibility === 'tiers') {
                const tiersData = settingsCache.get('default_content_visibility_tiers') || [];
                visibility = 'tiers',
                tiers = tiersData.map((tierId) => {
                    return {
                        id: tierId
                    };
                });
            } else if (defaultContentVisibility !== 'tiers') {
                visibility = settingsCache.get('default_content_visibility');
            }
        }

        return {
            uuid: crypto.randomUUID(),
            status: 'draft',
            featured: false,
            type: 'post',
            tiers,
            visibility: visibility,
            email_recipient_filter: 'all',
            show_title_and_feature_image: true
        };
    },

    relationships: ['tags', 'authors', 'mobiledoc_revisions', 'post_revisions', 'posts_meta', 'tiers'],
    relationshipConfig: {
        tags: {
            editable: true
        },
        authors: {
            editable: true
        },
        mobiledoc_revisions: {
            editable: true
        },
        post_revisions: {
            editable: true
        },
        posts_meta: {
            editable: true
        }
    },

    // NOTE: look up object, not super nice, but was easy to implement
    relationshipBelongsTo: {
        tags: 'tags',
        tiers: 'products',
        authors: 'users',
        posts_meta: 'posts_meta'
    },

    relationsMeta: {
        posts_meta: {
            targetTableName: 'posts_meta',
            foreignKey: 'post_id'
        },
        email: {
            targetTableName: 'emails',
            foreignKey: 'post_id'
        }
    },

    tiers() {
        return this.belongsToMany('Product', 'posts_products', 'post_id', 'product_id')
            .withPivot('sort_order')
            .query('orderBy', 'sort_order', 'ASC')
            .query((qb) => {
                // avoids bookshelf adding a `DISTINCT` to the query
                // we know the result set will already be unique and DISTINCT hurts query performance
                qb.columns('products.*');
            });
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        // transform URLs from __GHOST_URL__ to absolute
        [
            'mobiledoc',
            'lexical',
            'html',
            'plaintext',
            'custom_excerpt',
            'codeinjection_head',
            'codeinjection_foot',
            'feature_image',
            'og_image',
            'twitter_image',
            'canonical_url'
        ].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.transformReadyToAbsolute(attrs[attr]);
            }
        });

        return attrs;
    },

    // Alternative to Bookshelf's .format() that is only called when writing to db
    formatOnWrite(attrs) {
        // Ensure all URLs are stored as transform-ready with __GHOST_URL__ representing config.url
        const urlTransformMap = {
            mobiledoc: {
                method: 'mobiledocToTransformReady',
                options: {
                    cardTransformers: mobiledocLib.cards
                }
            },
            lexical: {
                method: 'lexicalToTransformReady',
                options: {
                    nodes: lexicalLib.nodes,
                    transformMap: lexicalLib.urlTransformMap
                }
            },
            html: 'htmlToTransformReady',
            plaintext: 'plaintextToTransformReady',
            custom_excerpt: 'htmlToTransformReady',
            codeinjection_head: 'htmlToTransformReady',
            codeinjection_foot: 'htmlToTransformReady',
            feature_image: 'toTransformReady',
            og_image: 'toTransformReady',
            twitter_image: 'toTransformReady',
            canonical_url: {
                method: 'toTransformReady',
                options: {
                    ignoreProtocol: false
                }
            }
        };

        Object.entries(urlTransformMap).forEach(([attrToTransform, transform]) => {
            let method = transform;
            let transformOptions = {};

            if (typeof transform === 'object') {
                method = transform.method;
                transformOptions = transform.options || {};
            }

            if (attrs[attrToTransform]) {
                attrs[attrToTransform] = urlUtils[method](attrs[attrToTransform], transformOptions);
            }
        });

        // transform visibility NQL queries to special-case values where necessary
        // ensures checks against special-case values such as `{{#has visibility="paid"}}` continue working
        if (attrs.visibility && !['public', 'members', 'paid', 'tiers'].includes(attrs.visibility)) {
            if (attrs.visibility === 'status:-free') {
                attrs.visibility = 'paid';
            } else {
                const visibilityNql = nql(attrs.visibility);

                if (visibilityNql.queryJSON({status: 'free'}) && visibilityNql.queryJSON({status: '-free'})) {
                    attrs.visibility = 'members';
                }
            }
        }

        return attrs;
    },

    /**
     * The base model keeps only the columns, which are defined in the schema.
     * We have to add the relations on top, otherwise bookshelf-relations
     * has no access to the nested relations, which should be updated.
     */
    permittedAttributes: function permittedAttributes() {
        let filteredKeys = ghostBookshelf.Model.prototype.permittedAttributes.apply(this, arguments);

        this.relationships.forEach((key) => {
            filteredKeys.push(key);
        });

        return filteredKeys;
    },

    orderAttributes: function orderAttributes() {
        let keys = ghostBookshelf.Model.prototype.orderAttributes.apply(this, arguments);

        // extend ordered keys with post_meta keys
        let postsMetaKeys = _.without(ghostBookshelf.model('PostsMeta').prototype.orderAttributes(), 'posts_meta.id', 'posts_meta.post_id');

        return [...keys, ...postsMetaKeys];
    },

    orderRawQuery: function orderRawQuery(field, direction, withRelated) {
        if (field === 'sentiment') {
            if (withRelated.includes('count.sentiment')) {
                // Internally sentiment can be included via the count.sentiment relation. We can do a quick optimisation of the query in that case.
                return {
                    orderByRaw: `count__sentiment ${direction}`
                };
            }
            return {
                orderByRaw: `(select AVG(score) from \`members_feedback\` where posts.id = members_feedback.post_id) ${direction}`
            };
        }
        if (field === 'email.open_rate' && withRelated && withRelated.indexOf('email') > -1) {
            return {
                // *1.0 is needed on one of the columns to prevent sqlite from
                // performing integer division rounding and always giving 0.
                // Order by emails.track_opens desc first so we always tracked emails
                // before untracked emails in the posts list.
                orderByRaw: `
                    emails.track_opens desc,
                    emails.opened_count * 1.0 / emails.email_count * 100 ${direction},
                    posts.created_at desc`,
                eagerLoad: 'email.open_rate'
            };
        }
    },

    filterExpansions: function filterExpansions() {
        const postsMetaKeys = _.without(ghostBookshelf.model('PostsMeta').prototype.orderAttributes(), 'posts_meta.id', 'posts_meta.post_id');

        const expansions = [{
            key: 'primary_tag',
            replacement: 'tags.slug',
            expansion: 'posts_tags.sort_order:0+tags.visibility:public'
        }, {
            key: 'primary_author',
            replacement: 'authors.slug',
            expansion: 'posts_authors.sort_order:0+authors.visibility:public'
        }, {
            key: 'authors',
            replacement: 'authors.slug'
        }, {
            key: 'author',
            replacement: 'authors.slug'
        }, {
            key: 'tag',
            replacement: 'tags.slug'
        }, {
            key: 'tags',
            replacement: 'tags.slug'
        }];

        const postMetaKeyExpansions = postsMetaKeys.map((pmk) => {
            return {
                key: pmk.split('.')[1],
                replacement: pmk
            };
        });

        return expansions.concat(postMetaKeyExpansions);
    },

    filterRelations: function filterRelations() {
        return {
            tags: {
                tableName: 'tags',
                type: 'manyToMany',
                joinTable: 'posts_tags',
                joinFrom: 'post_id',
                joinTo: 'tag_id'
            },
            authors: {
                tableName: 'users',
                tableNameAs: 'authors',
                type: 'manyToMany',
                joinTable: 'posts_authors',
                joinFrom: 'post_id',
                joinTo: 'author_id'
            },
            posts_meta: {
                tableName: 'posts_meta',
                type: 'oneToOne',
                joinFrom: 'post_id'
            },
            post_revisions: {
                tableName: 'post_revisions',
                type: 'oneToMany',
                joinFrom: 'post_id'
            }
        };
    },

    emitChange: function emitChange(event, options = {}) {
        let eventToTrigger;
        let resourceType = this.get('type');

        if (options.usePreviousAttribute) {
            resourceType = this.previous('type');
        }

        eventToTrigger = resourceType + '.' + event;

        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onFetched: async function onFetched(model, response, options) {
        if (!labs.isSet('collectionsCard')) {
            return;
        }

        await this.renderIfNeeded(model, options);
    },

    onFetchedCollection: async function onFetched(collection, response, options) {
        if (!labs.isSet('collectionsCard')) {
            return;
        }

        for await (const model of collection.models) {
            await this.renderIfNeeded(model, options);
        }
    },

    renderIfNeeded: async function renderIfNeeded(model, options = {}) {
        // pages can have their html cleared to "queue" a re-render to update dynamic data such
        // as collection cards. Detect that and re-render here so the page is always up to date
        if (model.get('lexical') !== null && model.get('html') === null) {
            const html = await lexicalLib.render(model.get('lexical'));
            const plaintext = htmlToPlaintext.excerpt(html);

            // avoid a DB query if we have no html - knex will set it to an empty string rather than NULL
            if (!html && !model.get('plaintext')) {
                return model;
            }

            // set model attributes so they are available immediately in code that uses the returned model
            model.set('html', html);
            model.set('plaintext', plaintext);

            // update database manually using knex to avoid hooks being called multiple times
            const query = ghostBookshelf.knex.raw('UPDATE posts SET html = ?, plaintext = ? WHERE id = ?', [html, plaintext, model.id]);
            if (options.transacting) {
                await query.transacting(options.transacting);
            } else {
                await query;
            }
        }

        return model;
    },

    /**
     * We update the tags after the Post was inserted.
     * We update the tags before the Post was updated, see `onSaving` event.
     * `onCreated` is called before `onSaved`.
     *
     * `onSaved` is the last event in the line - triggered for updating or inserting data.
     * bookshelf-relations listens on `created` + `updated`.
     * We ensure that we are catching the event after bookshelf relations.
     */
    onSaved: function onSaved(model, options) {
        ghostBookshelf.Model.prototype.onSaved.apply(this, arguments);

        if (options.method !== 'insert') {
            return;
        }

        const status = model.get('status');

        model.emitChange('added', options);

        if (['published', 'scheduled'].indexOf(status) !== -1) {
            model.emitChange(status, options);
        }
    },

    onUpdated: function onUpdated(model, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.statusChanging = model.get('status') !== model.previous('status');
        model.isPublished = model.get('status') === 'published';
        model.isScheduled = model.get('status') === 'scheduled';
        model.wasPublished = model.previous('status') === 'published';
        model.wasScheduled = model.previous('status') === 'scheduled';
        model.resourceTypeChanging = model.get('type') !== model.previous('type');
        model.publishedAtHasChanged = model.hasDateChanged('published_at');
        model.needsReschedule = model.publishedAtHasChanged && model.isScheduled;

        // Handle added and deleted for post -> page or page -> post
        if (model.resourceTypeChanging) {
            if (model.wasPublished) {
                model.emitChange('unpublished', Object.assign({usePreviousAttribute: true}, options));
            }

            if (model.wasScheduled) {
                model.emitChange('unscheduled', Object.assign({usePreviousAttribute: true}, options));
            }

            model.emitChange('deleted', Object.assign({usePreviousAttribute: true}, options));
            model.emitChange('added', options);

            if (model.isPublished) {
                model.emitChange('published', options);
            }

            if (model.isScheduled) {
                model.emitChange('scheduled', options);
            }
        } else {
            if (model.statusChanging) {
                // CASE: was published before and is now e.q. draft or scheduled
                if (model.wasPublished) {
                    model.emitChange('unpublished', options);
                }

                // CASE: was draft or scheduled before and is now e.q. published
                if (model.isPublished) {
                    model.emitChange('published', options);
                }

                // CASE: was draft or published before and is now e.q. scheduled
                if (model.isScheduled) {
                    model.emitChange('scheduled', options);
                }

                // CASE: from scheduled to something
                if (model.wasScheduled && !model.isScheduled && !model.isPublished) {
                    model.emitChange('unscheduled', options);
                }
            } else {
                if (model.isPublished) {
                    model.emitChange('published.edited', options);
                }

                if (model.needsReschedule) {
                    model.emitChange('rescheduled', options);
                }
            }

            // Fire edited if this wasn't a change between resourceType
            model.emitChange('edited', options);
        }

        if (model.statusChanging && (model.isPublished || model.wasPublished)) {
            this.handleStatusForAttachedModels(model, options);
        }
    },

    onDestroyed: async function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        if (labs.isSet('collectionsCard') && model.previous('type') === 'post' && model.previous('status') === 'published') {
            // reset all page HTML when a published post is deleted so they can be re-rendered
            // on next fetch so any collection cards are "dynamically" updated
            const resetPages = function resetPages(transacting) {
                return ghostBookshelf.knex.raw('UPDATE posts set html = NULL WHERE type = \'page\' AND lexical IS NOT NULL').transacting(transacting);
            };

            if (options.transacting) {
                await resetPages(options.transacting);
            } else {
                await ghostBookshelf.knex.transaction(async (transacting) => {
                    await resetPages(transacting);
                });
            }
        }

        if (model.previous('status') === 'published') {
            model.emitChange('unpublished', Object.assign({usePreviousAttribute: true}, options));
        }

        model.emitChange('deleted', Object.assign({usePreviousAttribute: true}, options));
    },

    onDestroying: function onDestroyed(model) {
        ghostBookshelf.Model.prototype.onDestroying.apply(this, arguments);

        this.handleAttachedModels(model);
    },

    handleAttachedModels: function handleAttachedModels(model) {
        /**
         * @NOTE:
         * Bookshelf only exposes the object that is being detached on `detaching`.
         * For the reason above, `detached` handler is using the scope of `detaching`
         * to access the models that are not present in `detached`.
         */
        model.related('tags').once('detaching', function detachingTags(collection, tag) {
            model.related('tags').once('detached', function detachedTags(detachedCollection, response, options) {
                tag.emitChange('detached', options);
                model.emitChange('tag.detached', options);
            });
        });

        model.related('tags').once('attaching', function tagsAttaching(collection, tags) {
            model.related('tags').once('attached', function tagsAttached(detachedCollection, response, options) {
                tags.forEach((tag) => {
                    tag.emitChange('attached', options);
                    model.emitChange('tag.attached', options);
                });
            });
        });

        model.related('authors').once('detaching', function authorsDetaching(collection, author) {
            model.related('authors').once('detached', function authorsDetached(detachedCollection, response, options) {
                author.emitChange('detached', options);
            });
        });

        model.related('authors').once('attaching', function authorsAttaching(collection, authors) {
            model.related('authors').once('attached', function authorsAttached(detachedCollection, response, options) {
                authors.forEach(author => author.emitChange('attached', options));
            });
        });
    },

    /**
     * @NOTE:
     * when status is changed from or to 'published' all related authors and tags
     * have to trigger recalculation in URL service because status is applied in filters for
     * these models
     */
    handleStatusForAttachedModels: function handleStatusForAttachedModels(model, options) {
        model.related('tags').forEach((tag) => {
            tag.emitChange('attached', options);
        });

        model.related('authors').forEach((author) => {
            author.emitChange('attached', options);
        });
    },

    onSaving: async function onSaving(model, attrs, options) {
        options = options || {};

        const self = this;
        let title;
        let i;

        // Variables to make the slug checking more readable
        const newTitle = this.get('title');

        const newStatus = this.get('status');
        const olderStatus = this.previous('status');
        const prevTitle = this.previous('title');
        const prevSlug = this.previous('slug');
        const publishedAt = this.get('published_at');
        const publishedAtHasChanged = this.hasDateChanged('published_at', {beforeWrite: true});
        const generatedFields = ['html', 'plaintext'];
        let tagsToSave;
        const ops = [];

        // normally we don't allow both mobiledoc & lexical through at the API level but there's
        // an exception for ?source=html which always sets both when the lexical editor is enabled.
        // That's necessary because at the input serializer layer we don't have access to the
        // actual model to check if this would result in a change of format

        if (this.previous('mobiledoc') && this.get('lexical')) {
            this.set('lexical', null);
        } else if (this.get('mobiledoc') && this.get('lexical')) {
            this.set('mobiledoc', null);
        }

        // CASE: disallow published -> scheduled
        // @TODO: remove when we have versioning based on updated_at
        if (newStatus !== olderStatus && newStatus === 'scheduled' && olderStatus === 'published') {
            return Promise.reject(new errors.ValidationError({
                message: tpl(messages.isAlreadyPublished, {key: 'status'})
            }));
        }

        if (options.method === 'insert') {
            if (!this.get('comment_id')) {
                this.set('comment_id', this.id);
            }
        }

        // CASE: both page and post can get scheduled
        if (newStatus === 'scheduled') {
            if (!publishedAt) {
                return Promise.reject(new errors.ValidationError({
                    message: tpl(messages.valueCannotBeBlank, {key: 'published_at'})
                }));
            } else if (!moment(publishedAt).isValid()) {
                return Promise.reject(new errors.ValidationError({
                    message: tpl(messages.valueCannotBeBlank, {key: 'published_at'})
                }));
                // CASE: to schedule/reschedule a post, a minimum diff of x minutes is needed (default configured is 2minutes)
            } else if (
                publishedAtHasChanged &&
                moment(publishedAt).isBefore(moment().add(config.get('times').cannotScheduleAPostBeforeInMinutes, 'minutes')) &&
                !options.importing &&
                (!options.context || !options.context.internal)
            ) {
                return Promise.reject(new errors.ValidationError({
                    message: tpl(messages.expectedPublishedAtInFuture, {
                        cannotScheduleAPostBeforeInMinutes: config.get('times').cannotScheduleAPostBeforeInMinutes
                    })
                }));
            }
        }

        // CASE: detect lowercase/uppercase tag slugs
        if (!_.isUndefined(this.get('tags')) && !_.isNull(this.get('tags'))) {
            tagsToSave = [];

            //  and deduplicate upper/lowercase tags
            loopTags: for (const tag of this.get('tags')) {
                if (!tag.id && !tag.tag_id && tag.slug) {
                    // Clean up the provided slugs before we do any matching with existing tags
                    tag.slug = await ghostBookshelf.Model.generateSlug(
                        Tag,
                        tag.slug,
                        {skipDuplicateChecks: true}
                    );
                }

                for (i = 0; i < tagsToSave.length; i = i + 1) {
                    if (tagsToSave[i].name && tag.name && tagsToSave[i].name.toLocaleLowerCase() === tag.name.toLocaleLowerCase()) {
                        continue loopTags;
                    }
                }

                tagsToSave.push(tag);
            }

            this.set('tags', tagsToSave);
        }

        /**
         * CASE: Attach id to update existing posts_meta entry for a post
         * CASE: Don't create new posts_meta entry if post meta is empty
         */
        if (!_.isUndefined(this.get('posts_meta')) && !_.isNull(this.get('posts_meta'))) {
            let postsMetaData = this.get('posts_meta');
            let relatedModelId = model.related('posts_meta').get('id');
            let hasNoData = !_.values(postsMetaData).some(x => !!x);
            if (relatedModelId && !_.isEmpty(postsMetaData)) {
                postsMetaData.id = relatedModelId;
                this.set('posts_meta', postsMetaData);
            } else if (_.isEmpty(postsMetaData) || hasNoData) {
                this.set('posts_meta', null);
            }
        }

        this.handleAttachedModels(model);

        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        // do not allow generated fields to be overridden via the API
        if (!options.migrating) {
            generatedFields.forEach((field) => {
                if (this.hasChanged(field)) {
                    this.set(field, this.previous(field));
                }
            });
        }

        if (!this.get('mobiledoc') && !this.get('lexical')) {
            this.set('lexical', JSON.stringify(lexicalLib.blankDocument));
        }

        // If we're force re-rendering we want to make sure that all image cards
        // have original dimensions stored in the payload for use by card renderers
        if (options.force_rerender && this.get('mobiledoc')) {
            this.set('mobiledoc', await mobiledocLib.populateImageSizes(this.get('mobiledoc')));
        }

        // CASE: mobiledoc has changed, generate html
        // CASE: ?force_rerender=true passed via Admin API
        // CASE: html is null, but mobiledoc exists (only important for migrations & importing)
        if (
            !this.get('lexical') &&
            (
                this.hasChanged('mobiledoc')
                || options.force_rerender
                || (!this.get('html') && (options.migrating || options.importing))
            )
        ) {
            try {
                this.set('html', mobiledocLib.render(JSON.parse(this.get('mobiledoc'))));
            } catch (err) {
                throw new errors.ValidationError({
                    message: tpl(messages.invalidMobiledocStructure),
                    help: 'https://ghost.org/docs/publishing/'
                });
            }
        }

        // CASE: lexical has changed, generate html
        // CASE: ?force_rerender=true passed via Admin API
        // CASE: html is null, but lexical exists (only important for migrations & importing)
        if (
            !this.get('mobiledoc') &&
            (
                this.hasChanged('lexical')
                || options.force_rerender
                || (!this.get('html') && (options.migrating || options.importing))
            )
        ) {
            try {
                this.set('html', await lexicalLib.render(this.get('lexical'), {transacting: options.transacting}));
            } catch (err) {
                throw new errors.ValidationError({
                    message: tpl(messages.invalidLexicalStructure),
                    context: err.message,
                    property: 'lexical',
                    help: tpl(messages.invalidLexicalStructureHelp)
                });
            }
        }

        if (this.hasChanged('html') || !this.get('plaintext')) {
            let plaintext;

            if (this.get('html') === null) {
                plaintext = null;
            } else {
                plaintext = htmlToPlaintext.excerpt(this.get('html'));
            }

            // CASE: html is e.g. <p></p>
            // @NOTE: Otherwise we will always update the resource to `plaintext: ''` and Bookshelf thinks that this
            //        value was modified.
            if (plaintext || plaintext !== this.get('plaintext')) {
                this.set('plaintext', plaintext);
            }
        }

        // disabling sanitization until we can implement a better version
        if (!options.importing) {
            title = this.get('title') || tpl(messages.untitled);
            this.set('title', _.toString(title).trim());
        }

        // ### Business logic for published_at and published_by
        // If the current status is 'published' and published_at is not set, set it to now
        if ((newStatus === 'published' || newStatus === 'sent') && !publishedAt) {
            this.set('published_at', new Date());
        }

        // If the current status is 'published' and the status has just changed ensure published_by is set correctly
        if ((newStatus === 'published' || newStatus === 'sent') && this.hasChanged('status')) {
            // unless published_by is set and we're importing, set published_by to contextUser
            if (!(this.get('published_by') && options.importing)) {
                this.set('published_by', String(this.contextUser(options)));
            }
        } else {
            // In any other case (except import), `published_by` should not be changed
            if (this.hasChanged('published_by') && !options.importing) {
                this.set('published_by', this.previous('published_by') ? String(this.previous('published_by')) : null);
            }
        }

        // newsletter_id is read-only and should only be set using the newsletter param when publishing/scheduling
        if (options.newsletter
            && !this.get('newsletter_id')
            && this.hasChanged('status')
            && (newStatus === 'published' || newStatus === 'scheduled' || newStatus === 'sent')) {
            // Map the passed slug to the id + validate the passed newsletter
            ops.push(async () => {
                const newsletter = await Newsletter.findOne({slug: options.newsletter}, {transacting: options.transacting, filter: 'status:active'});
                if (!newsletter) {
                    throw new BadRequestError({
                        message: messages.invalidNewsletter
                    });
                }
                this.set('newsletter_id', newsletter.id);
            });

            // If the `email_segment` isn't passed at the same time, reset it to be 100% sure that they can only be used together
            this.set('email_recipient_filter', 'all');

            // email_segment is read-only and should only be set using a query param when publishing/scheduling
            // we can't set it if we don't pass newsletter
            if (options.email_segment) {
                this.set('email_recipient_filter', options.email_segment);
            }
        }

        // ensure draft posts have the email_recipient_filter reset unless an email has already been sent
        if (newStatus === 'draft' && this.hasChanged('status')) {
            ops.push(function ensureSendEmailWhenPublishedIsUnchanged() {
                return self.getLazyRelation('email', {transacting: options.transacting}).then((email) => {
                    if (!email) {
                        self.set('email_recipient_filter', 'all');
                        self.set('newsletter_id', null);
                    }
                });
            });
        }

        // NOTE: this is a stopgap solution for email-only posts where their status is unchanged after publish
        //       but the usual publis/send newsletter flow continues
        const hasEmailOnlyFlag = _.get(attrs, 'posts_meta.email_only') || model.related('posts_meta').get('email_only');
        if (hasEmailOnlyFlag && (newStatus === 'published') && this.hasChanged('status')) {
            this.set('status', 'sent');
        } else if (!hasEmailOnlyFlag && (newStatus === 'sent') && this.hasChanged('status')) {
            // Prevent setting status to 'sent' for non email only posts
            this.set('status', 'published');
        }

        // If a title is set, not the same as the old title, a draft post, and has never been published
        if (prevTitle !== undefined && newTitle !== prevTitle && newStatus === 'draft' && !publishedAt) {
            ops.push(function updateSlug() {
                // Pass the new slug through the generator to strip illegal characters, detect duplicates
                return ghostBookshelf.Model.generateSlug(Post, self.get('title'),
                    {status: 'all', transacting: options.transacting, importing: options.importing})
                    .then(function then(slug) {
                        // After the new slug is found, do another generate for the old title to compare it to the old slug
                        return ghostBookshelf.Model.generateSlug(Post, prevTitle,
                            {status: 'all', transacting: options.transacting, importing: options.importing}
                        ).then(function prevTitleSlugGenerated(prevTitleSlug) {
                            // If the old slug is the same as the slug that was generated from the old title
                            // then set a new slug. If it is not the same, means was set by the user
                            if (prevTitleSlug === prevSlug) {
                                self.set({slug: slug});
                            }
                        });
                    });
            });
        } else {
            ops.push(function updateSlug() {
                // If any of the attributes above were false, set initial slug and check to see if slug was changed by the user
                if (self.hasChanged('slug') || !self.get('slug')) {
                    // Pass the new slug through the generator to strip illegal characters, detect duplicates
                    return ghostBookshelf.Model.generateSlug(Post, self.get('slug') || self.get('title'),
                        {status: 'all', transacting: options.transacting, importing: options.importing})
                        .then(function then(slug) {
                            self.set({slug: slug});
                        });
                }

                return Promise.resolve();
            });
        }

        // CASE: Handle mobiledoc backups/revisions. This is a pure database feature.
        if (model.hasChanged('mobiledoc') && !model.get('lexical') && !options.importing && !options.migrating) {
            ops.push(function updateRevisions() {
                return ghostBookshelf.model('MobiledocRevision')
                    .findAll(Object.assign({
                        filter: `post_id:'${model.id}'`,
                        columns: ['id']
                    }, _.pick(options, 'transacting')))
                    .then((revisions) => {
                        /**
                         * Store prev + latest mobiledoc content, because we have decided against a migration, which
                         * iterates over all posts and creates a copy of the current mobiledoc content.
                         *
                         * Reasons:
                         *   - usually migrations for the post table are slow and error-prone
                         *   - there is no need to create a copy for all posts now, because we only want to ensure
                         *     that posts, which you are currently working on, are getting a content backup
                         *   - no need to create revisions for existing published posts
                         *
                         * The feature is very minimal in the beginning. As soon as you update to this Ghost version,
                         * you
                         */
                        if (!revisions.length && options.method !== 'insert') {
                            model.set('mobiledoc_revisions', [{
                                post_id: model.id,
                                mobiledoc: model.previous('mobiledoc'),
                                created_at_ts: Date.now() - 1
                            }, {
                                post_id: model.id,
                                mobiledoc: model.get('mobiledoc'),
                                created_at_ts: Date.now()
                            }]);
                        } else {
                            const revisionsJSON = revisions.toJSON().slice(0, MOBILEDOC_REVISIONS_COUNT - 1);

                            model.set('mobiledoc_revisions', revisionsJSON.concat([{
                                post_id: model.id,
                                mobiledoc: model.get('mobiledoc'),
                                created_at_ts: Date.now()
                            }]));
                        }
                    });
            });
        }
        if (!model.get('mobiledoc') && !options.importing && !options.migrating) {
            const postRevisions = new PostRevisions({
                config: {
                    max_revisions: POST_REVISIONS_COUNT,
                    revision_interval_ms: POST_REVISIONS_INTERVAL_MS
                }
            });
            let authorId = this.contextUser(options);
            const authorExists = await ghostBookshelf.model('User').findOne({id: authorId}, {transacting: options.transacting});
            if (!authorExists) {
                authorId = await ghostBookshelf.model('User').getOwnerUser().get('id');
            }
            ops.push(async function updateRevisions() {
                const revisionModels = await ghostBookshelf.model('PostRevision')
                    .findAll(Object.assign({
                        filter: `post_id:'${model.id}'`,
                        columns: ['id', 'lexical', 'created_at', 'author_id', 'title', 'reason', 'post_status', 'created_at_ts', 'feature_image']
                    }, _.pick(options, 'transacting')));

                const revisions = revisionModels.toJSON();

                const current = {
                    id: model.id,
                    lexical: model.get('lexical'),
                    html: model.get('html'),
                    author_id: authorId,
                    feature_image: model.get('feature_image'),
                    feature_image_alt: model.get('posts_meta')?.feature_image_alt,
                    feature_image_caption: model.get('posts_meta')?.feature_image_caption,
                    title: model.get('title'),
                    custom_excerpt: model.get('custom_excerpt'),
                    post_status: model.get('status')
                };

                // This can be refactored once we have the status stored in each revision
                const revisionOptions = {
                    forceRevision: options.save_revision,
                    isPublished: newStatus === 'published',
                    newStatus,
                    olderStatus
                };
                const newRevisions = await postRevisions.getRevisions(current, revisions, revisionOptions);
                model.set('post_revisions', newRevisions);
            });
        }

        // CASE: Convert post to lexical on the fly
        if (options.convert_to_lexical) {
            ops.push(async function convertToLexical() {
                const mobiledoc = model.get('mobiledoc');
                if (mobiledoc !== null) { // only run conversion when there is a mobiledoc string
                    const lexical = mobiledocToLexical(mobiledoc);
                    model.set('lexical', lexical);
                    model.set('mobiledoc', null);
                }
            });
        }

        if (this.get('tiers')) {
            this.set('tiers', this.get('tiers').map(t => ({
                id: t.id
            })));

            // Don't associate the free tier with the post
            const freeTier = await ghostBookshelf.model('Product').findOne({type: 'free'}, {require: false, transacting: options.transacting ?? undefined});
            if (freeTier) {
                this.set('tiers', this.get('tiers').filter(t => t.id !== freeTier.id));
            }
        }

        if (labs.isSet('collectionsCard') && this.get('type') === 'post' && (newStatus === 'published' || olderStatus === 'published')) {
            // reset all page HTML when a published post is updated so they can be re-rendered
            // on next fetch so any collection cards are "dynamically" updated
            ops.push(async function resetPageHTML() {
                const query = ghostBookshelf.knex.raw('UPDATE posts set html = NULL WHERE type = ? AND lexical IS NOT NULL', ['page']);
                if (options.transacting) {
                    await query.transacting(options.transacting);
                } else {
                    await query;
                }
            });
        }

        return sequence(ops);
    },

    created_by: function createdBy() {
        return this.belongsTo('User', 'created_by');
    },

    updated_by: function updatedBy() {
        return this.belongsTo('User', 'updated_by');
    },

    published_by: function publishedBy() {
        return this.belongsTo('User', 'published_by');
    },

    authors: function authors() {
        return this.belongsToMany('User', 'posts_authors', 'post_id', 'author_id')
            .withPivot('sort_order')
            .query('orderBy', 'sort_order', 'ASC');
    },

    tags: function tags() {
        return this.belongsToMany('Tag', 'posts_tags', 'post_id', 'tag_id')
            .withPivot('sort_order')
            .query('orderBy', 'sort_order', 'ASC');
    },

    mobiledoc_revisions() {
        return this.hasMany('MobiledocRevision', 'post_id');
    },

    post_revisions() {
        return this.hasMany('PostRevision', 'post_id');
    },

    posts_meta: function postsMeta() {
        return this.hasOne('PostsMeta', 'post_id');
    },

    email: function email() {
        return this.hasOne('Email', 'post_id');
    },

    newsletter: function newsletter() {
        return this.belongsTo('Newsletter', 'newsletter_id');
    },

    /**
     * @NOTE:
     * If you are requesting models with `columns`, you try to only receive some fields of the model/s.
     * But the model layer is complex and needs specific fields in specific situations.
     *
     * ### url generation was removed but default columns need to be checked before removal
     *   - @TODO: with dynamic routing, we no longer need default columns to fetch
     *   - because with static routing Ghost generated the url on runtime and needed the following attributes:
     *     - `slug`: /:slug/
     *     - `published_at`: /:year/:slug
     *     - `author_id`: /:author/:slug, /:primary_author/:slug
     *     - now, the UrlService pre-generates urls based on the resources
     *     - you can ask `urlService.getUrlByResourceId(post.id)`
     *
     * ### events
     *   - you call `findAll` with `columns: id`
     *   - then you trigger `post.save()` on the response
     *   - bookshelf events (`onSaving`) and model events (`emitChange`) are triggered
     *   - but you only fetched the id column, this will trouble (!), because the event hooks require more
     *     data than just the id
     *   - @TODO: we need to disallow this (!)
     *   - you should use `models.Post.edit(..)`
     *      - this disallows using the `columns` option
     *   - same for destroy - you should use `models.Post.destroy(...)`
     *
     * @IMPORTANT: This fn should **never** be used when updating models (models.Post.edit)!
     *            Because the events for updating a resource require most of the fields.
     *            This is protected by the fn `permittedOptions`.
     */
    defaultColumnsToFetch: function defaultColumnsToFetch() {
        return ['id', 'published_at', 'slug'];
    },
    /**
     * If the `formats` option is not used, we return `html` be default.
     * Otherwise we return what is requested e.g. `?formats=mobiledoc,plaintext`
     *
     * This method is only used by the raw-knex plugin.
     * We have moved the logic into the serializers for the API.
     */
    formatsToJSON: function formatsToJSON(attrs, options) {
        const defaultFormats = ['html'];
        const formatsToKeep = options.formats || defaultFormats;

        // Iterate over all known formats, and if they are not in the keep list, remove them
        _.each(Post.allowedFormats, function (format) {
            if (formatsToKeep.indexOf(format) === -1) {
                delete attrs[format];
            }
        });

        return attrs;
    },

    toJSON: function toJSON(unfilteredOptions) {
        const options = Post.filterOptions(unfilteredOptions, 'toJSON');
        let attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        // CASE: never expose the mobiledoc revisions
        delete attrs.mobiledoc_revisions;

        // If the current column settings allow it...
        if (!options.columns || (options.columns && options.columns.indexOf('primary_tag') > -1)) {
            // ... attach a computed property of primary_tag which is the first tag if it is public, else null
            if (attrs.tags && attrs.tags.length > 0 && attrs.tags[0].visibility === 'public') {
                attrs.primary_tag = attrs.tags[0];
            } else {
                attrs.primary_tag = null;
            }
        }

        return attrs;
    },

    // NOTE: overloads models base method to take `post_meta` changes into account
    wasChanged() {
        if (!this._changed) {
            return true;
        }

        const postMetaChanged = this.relations.posts_meta && this.relations.posts_meta._changed && Object.keys(this.relations.posts_meta._changed).length;

        if (!Object.keys(this._changed).length && !postMetaChanged) {
            return false;
        }

        return true;
    },

    enforcedFilters: function enforcedFilters(options) {
        return options.context && options.context.public ? 'status:published' : null;
    },

    defaultFilters: function defaultFilters(options) {
        if (options.context && options.context.internal) {
            return null;
        }

        return options.context && options.context.public ? 'type:post' : 'type:post+status:published';
    },

    /**
     * You can pass an extra `status=VALUES` field.
     * Long-Term: We should deprecate these short cuts and force users to use the filter param.
     */
    extraFilters: function extraFilters(options) {
        if (!options.status) {
            return null;
        }

        let filter = null;

        // CASE: "status" is passed, combine filters
        if (options.status && options.status !== 'all') {
            options.status = _.includes(ALL_STATUSES, options.status) ? options.status : 'published';

            if (!filter) {
                filter = `status:${options.status}`;
            } else {
                filter = `${filter}+status:${options.status}`;
            }
        } else if (options.status === 'all') {
            if (!filter) {
                filter = `status:[${ALL_STATUSES}]`;
            } else {
                filter = `${filter}+status:[${ALL_STATUSES}]`;
            }
        }

        delete options.status;
        return filter;
    }
}, {
    getBulkActionExtraContext: function (options) {
        if (options && options.filter && options.filter.includes('type:page')) {
            return {
                type: 'page'
            };
        }
        return {
            type: 'post'
        };
    },
    allowedFormats: ['mobiledoc', 'lexical', 'html', 'plaintext'],

    orderDefaultOptions: function orderDefaultOptions() {
        return {
            status: 'ASC',
            published_at: 'DESC',
            updated_at: 'DESC',
            id: 'DESC'
        };
    },

    orderDefaultRaw: function (options) {
        let order = '' +
            'CASE WHEN posts.status = \'scheduled\' THEN 1 ' +
            'WHEN posts.status = \'draft\' THEN 2 ' +
            'ELSE 3 END ASC,' +
            'CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,' +
            'posts.updated_at DESC,' +
            'posts.id DESC';

        // CASE: if the filter contains an `IN` operator, we should return the posts first, which match both tags
        if (options.filter && options.filter.match(/(tags|tag):\s?\[.*\]/)) {
            order = `(SELECT count(*) FROM posts_tags WHERE post_id = posts.id) DESC, ${order}`;
        }

        // CASE: if the filter contains an `IN` operator, we should return the posts first, which match both authors
        if (options.filter && options.filter.match(/(authors|author):\s?\[.*\]/)) {
            order = `(SELECT count(*) FROM posts_authors WHERE post_id = posts.id) DESC, ${order}`;
        }

        return order;
    },

    /**
     * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Array} Keys allowed in the `options` hash of the model's method.
     */
    permittedOptions: function permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);

        // allowlists for the `options` hash argument on methods, by method name.
        // these are the only options that can be passed to Bookshelf / Knex.
        const validOptions = {
            findOne: ['columns', 'importing', 'withRelated', 'require', 'filter'],
            findPage: ['status','selectRaw'],

            findAll: ['columns', 'filter'],
            destroy: ['destroyAll', 'destroyBy'],
            edit: ['filter', 'email_segment', 'force_rerender', 'newsletter', 'save_revision', 'convert_to_lexical']
        };

        // The post model additionally supports having a formats option
        options.push('formats');

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    /**
     * We have to ensure consistency. If you listen on model events (e.g. `post.published`), you can expect that you always
     * receive all fields including relations. Otherwise you can't rely on a consistent flow. And we want to avoid
     * that event listeners have to re-fetch a resource. This function is used in the context of inserting
     * and updating resources. We won't return the relations by default for now.
     *
     * We also always fetch posts metadata to keep current behavior consistent
     */
    defaultRelations: function defaultRelations(methodName, options) {
        if (['edit', 'add', 'destroy'].indexOf(methodName) !== -1) {
            options.withRelated = _.union(['authors', 'tags', 'post_revisions', 'post_revisions.author'], options.withRelated || []);
        }

        // NOTE: only include post_meta relation when requested in 'columns' or by default
        //       optimization is needed to be able to perform .findAll on large SQLite datasets
        if (!options.columns
        || (
            options.columns
            && _.intersection(_.without(ghostBookshelf.model('PostsMeta').prototype.permittedAttributes(), 'id', 'post_id'), options.columns).length)
        ) {
            options.withRelated = _.union(['posts_meta'], options.withRelated || []);
        }

        return options;
    },

    /**
     * Manually add 'tags' attribute since it's not in the schema and call parent.
     *
     * @param {Object} data Has keys representing the model's attributes/fields in the database.
     * @return {Object} The filtered results of the passed in data, containing only what's allowed in the schema.
     */
    filterData: function filterData(data) {
        const filteredData = ghostBookshelf.Model.filterData.apply(this, arguments);
        const extraData = _.pick(data, this.prototype.relationships);

        _.merge(filteredData, extraData);
        return filteredData;
    },

    // ## Model Data Functions

    /**
     * ### Find One
     * @extends ghostBookshelf.Model.findOne to handle post status
     * **See:** [ghostBookshelf.Model.findOne](base.js.html#Find%20One)
     */
    findOne: function findOne(data = {}, options = {}) {
        if (!options.context || !options.context.internal) {
            // @TODO: remove when we drop v0.1
            if (!options.filter && !data.status) {
                data.status = 'published';
            }
        }

        if (data.status === 'all') {
            delete data.status;
        }

        return ghostBookshelf.Model.findOne.call(this, data, options);
    },

    /**
     * ### Edit
     * Fetches and saves to Post. See model.Base.edit
     * **See:** [ghostBookshelf.Model.edit](base.js.html#edit)
     */
    edit: function edit(data, unfilteredOptions) {
        let options = this.filterOptions(unfilteredOptions, 'edit', {extraAllowedProperties: ['id']});

        const editPost = () => {
            options.forUpdate = true;

            return ghostBookshelf.Model.edit.call(this, data, options)
                .then((post) => {
                    return this.findOne({
                        status: 'all',
                        id: options.id
                    }, _.merge({transacting: options.transacting}, unfilteredOptions))
                        .then((found) => {
                            if (found) {
                                // Pass along the updated attributes for checking status changes
                                found._previousAttributes = post._previousAttributes;
                                found._changed = post._changed;

                                // NOTE: `posts_meta` fields are equivalent in terms of "wasChanged" logic to the rest of posts's table fields.
                                //       Keeping track of them is needed to check if anything was changed in post's resource.
                                if (found.relations.posts_meta) {
                                    found.relations.posts_meta._changed = post.relations.posts_meta._changed;
                                }

                                return found;
                            }
                        });
                });
        };

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;
                return editPost();
            });
        }

        return editPost();
    },

    bulkEdit: async function bulkEdit(ids, tableName, options) {
        if (tableName === this.prototype.tableName) {
            const result = await ghostBookshelf.Model.bulkEdit.call(this, ids, tableName, options);

            if (labs.isSet('collectionsCard')) {
                // reset all page HTML so collection cards can be re-rendered with updated posts
                // NOTE: we can't check for only published edits here as we don't have access to previous values
                //       to see if a previously published post has been unpublished, so we just reset all pages
                const pageResetQuery = ghostBookshelf.knex.raw('UPDATE posts set html = NULL WHERE type = "page" AND lexical IS NOT NULL');
                await (options.transacting ? pageResetQuery.transacting(options.transacting) : pageResetQuery);
            }

            return result;
        } else {
            return ghostBookshelf.Model.bulkEdit.call(this, ids, tableName, options);
        }
    },

    /**
     * ### Add
     * @extends ghostBookshelf.Model.add to handle returning the full object
     * **See:** [ghostBookshelf.Model.add](base.js.html#add)
     */
    add: function add(data, unfilteredOptions) {
        let options = this.filterOptions(unfilteredOptions, 'add', {extraAllowedProperties: ['id']});

        const addPost = (() => {
            return ghostBookshelf.Model.add.call(this, data, options)
                .then((post) => {
                    return this.findOne({
                        status: 'all',
                        id: post.id
                    }, _.merge({transacting: options.transacting}, unfilteredOptions));
                });
        });

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;

                return addPost();
            });
        }

        return addPost();
    },

    destroy: function destroy(unfilteredOptions) {
        let options = this.filterOptions(unfilteredOptions, 'destroy', {extraAllowedProperties: ['id']});

        const destroyPost = () => {
            return ghostBookshelf.Model.destroy.call(this, options);
        };

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;
                return destroyPost();
            });
        }

        return destroyPost();
    },

    bulkDestroy: async function bulkDestroy(ids, tableName, options) {
        if (tableName === this.prototype.tableName) {
            if (labs.isSet('collectionsCard')) {
                // get count of published posts to be destroyed before they no longer exist to count
                const deletedPublishedCount = await this.query((qb) => {
                    qb.where('type', 'post')
                        .where('status', 'published')
                        .whereIn('id', ids);
                }).count({transacting: options.transacting});

                const result = await ghostBookshelf.Model.bulkDestroy.call(this, ids, tableName, options);

                // if we've deleted any published posts, we need to reset the html for all pages so dynamic collection
                // card content can be re-rendered
                if (deletedPublishedCount > 0) {
                    const pageResetQuery = ghostBookshelf.knex.raw('UPDATE posts set html = NULL WHERE type = "page" AND lexical IS NOT NULL');
                    await (options.transacting ? pageResetQuery.transacting(options.transacting) : pageResetQuery);
                }

                return result;
            } else {
                return ghostBookshelf.Model.bulkDestroy.call(this, ids, tableName, options);
            }
        } else {
            return ghostBookshelf.Model.bulkDestroy.call(this, ids, tableName, options);
        }
    },

    // NOTE: the `authors` extension is the parent of the post model. It also has a permissible function.
    permissible: async function permissible(postModel, action, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasApiKeyPermission) {
        let isContributor;
        let isOwner;
        let isAdmin;
        let isEditor;
        let isIntegration;
        let isEdit;
        let isAdd;
        let isDestroy;

        function isChanging(attr) {
            return unsafeAttrs[attr] && unsafeAttrs[attr] !== postModel.get(attr);
        }

        function isPublished() {
            return unsafeAttrs.status && unsafeAttrs.status !== 'draft';
        }

        function isDraft() {
            return postModel.get('status') === 'draft';
        }

        isContributor = loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Contributor'});
        isOwner = loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Owner'});
        isAdmin = loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Administrator'});
        isEditor = loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Editor'});
        isIntegration = loadedPermissions.apiKey && _.some(loadedPermissions.apiKey.roles, {name: 'Admin Integration'});

        isEdit = (action === 'edit');
        isAdd = (action === 'add');
        isDestroy = (action === 'destroy');

        if (limitService.isLimited('members')) {
            // You can't publish a post if you're over your member limit
            if ((isEdit && isChanging('status') && isDraft()) || (isAdd && isPublished())) {
                await limitService.errorIfIsOverLimit('members');
            }
        }

        if (isContributor && isEdit) {
            // Only allow contributor edit if status is changing, and the post is a draft post
            hasUserPermission = !isChanging('status') && isDraft();
        } else if (isContributor && isAdd) {
            // If adding, make sure it's a draft post and has the correct ownership
            hasUserPermission = !isPublished();
        } else if (isContributor && isDestroy) {
            // If destroying, only allow contributor to destroy their own draft posts
            hasUserPermission = isDraft();
        } else if (!(isOwner || isAdmin || isEditor || isIntegration)) {
            hasUserPermission = !isChanging('visibility');
        }

        const excludedAttrs = [];
        if (isContributor) {
            // Note: at the moment primary_tag is a computed field,
            // meaning we don't add it to this list. However, if the primary_tag/primary_author
            // ever becomes a db field rather than a computed field, add it to this list
            // TODO: once contributors are able to edit existing tags, this can be removed
            // @TODO: we need a concept for making a diff between incoming tags and existing tags
            excludedAttrs.push('tags');
        }

        if (hasUserPermission && hasApiKeyPermission) {
            return Promise.resolve({excludedAttrs});
        }

        return Promise.reject(new errors.NoPermissionError({
            message: tpl(messages.notEnoughPermission)
        }));
    },

    countRelations() {
        return {
            signups(modelOrCollection) {
                modelOrCollection.query('columns', 'posts.*', (qb) => {
                    qb.count('members_created_events.id')
                        .from('members_created_events')
                        .whereRaw('posts.id = members_created_events.attribution_id')
                        .as('count__signups');
                });
            },
            paid_conversions(modelOrCollection) {
                modelOrCollection.query('columns', 'posts.*', (qb) => {
                    qb.count('members_subscription_created_events.id')
                        .from('members_subscription_created_events')
                        .whereRaw('posts.id = members_subscription_created_events.attribution_id')
                        .as('count__paid_conversions');
                });
            },
            /**
             * Combination of sigups and paid conversions, but unique per member
             */
            conversions(modelOrCollection) {
                modelOrCollection.query('columns', 'posts.*', (qb) => {
                    qb.count('*')
                        .from('k')
                        .with('k', (q) => {
                            q.select('member_id')
                                .from('members_subscription_created_events')
                                .whereRaw('posts.id = members_subscription_created_events.attribution_id')
                                .union(function () {
                                    this.select('member_id')
                                        .from('members_created_events')
                                        .whereRaw('posts.id = members_created_events.attribution_id');
                                });
                        })
                        .as('count__conversions');
                });
            },
            clicks(modelOrCollection) {
                modelOrCollection.query('columns', 'posts.*', (qb) => {
                    qb.countDistinct('members_click_events.member_id')
                        .from('members_click_events')
                        .join('redirects', 'members_click_events.redirect_id', 'redirects.id')
                        .whereRaw('posts.id = redirects.post_id')
                        .as('count__clicks');
                });
            },
            sentiment(modelOrCollection) {
                modelOrCollection.query('columns', 'posts.*', (qb) => {
                    qb.select(qb.client.raw('COALESCE(ROUND(AVG(score) * 100), 0)'))
                        .from('members_feedback')
                        .whereRaw('posts.id = members_feedback.post_id')
                        .as('count__sentiment');
                });
            },
            negative_feedback(modelOrCollection) {
                modelOrCollection.query('columns', 'posts.*', (qb) => {
                    qb.count('*')
                        .from('members_feedback')
                        .whereRaw('posts.id = members_feedback.post_id AND members_feedback.score = 0')
                        .as('count__negative_feedback');
                });
            },
            positive_feedback(modelOrCollection) {
                modelOrCollection.query('columns', 'posts.*', (qb) => {
                    qb.sum('score')
                        .from('members_feedback')
                        .whereRaw('posts.id = members_feedback.post_id')
                        .as('count__positive_feedback');
                });
            }
        };
    }
});

Posts = ghostBookshelf.Collection.extend({
    model: Post
});

// Extension for handling the logic for author + multiple authors
Post = relations.authors.extendModel(Post, Posts, ghostBookshelf);

module.exports = {
    Post: ghostBookshelf.model('Post', Post),
    Posts: ghostBookshelf.collection('Posts', Posts)
};
