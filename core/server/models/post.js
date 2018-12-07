// # Post Model
const _ = require('lodash');
const uuid = require('uuid');
const moment = require('moment');
const Promise = require('bluebird');
const sequence = require('../lib/promise/sequence');
const common = require('../lib/common');
const htmlToText = require('html-to-text');
const ghostBookshelf = require('./base');
const config = require('../config');
const converters = require('../lib/mobiledoc/converters');
const relations = require('./relations');
const MOBILEDOC_REVISIONS_COUNT = 10;
const ALL_STATUSES = ['published', 'draft', 'scheduled'];

let Post;
let Posts;

Post = ghostBookshelf.Model.extend({

    tableName: 'posts',

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
        return {
            uuid: uuid.v4(),
            status: 'draft',
            featured: false,
            page: false,
            visibility: 'public'
        };
    },

    relationships: ['tags', 'authors', 'mobiledoc_revisions'],

    // NOTE: look up object, not super nice, but was easy to implement
    relationshipBelongsTo: {
        tags: 'tags',
        authors: 'users'
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

    emitChange: function emitChange(event, options) {
        let eventToTrigger;

        var resourceType = this.get('page') ? 'page' : 'post';

        if (options.useUpdatedAttribute) {
            resourceType = this.updated('page') ? 'page' : 'post';
        } else if (options.usePreviousAttribute) {
            resourceType = this.previous('page') ? 'page' : 'post';
        }

        eventToTrigger = resourceType + '.' + event;

        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
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
    onSaved: function onSaved(model, response, options) {
        if (options.method !== 'insert') {
            return;
        }

        var status = model.get('status');

        model.emitChange('added', options);

        if (['published', 'scheduled'].indexOf(status) !== -1) {
            model.emitChange(status, options);
        }
    },

    onUpdated: function onUpdated(model, attrs, options) {
        model.statusChanging = model.get('status') !== model.updated('status');
        model.isPublished = model.get('status') === 'published';
        model.isScheduled = model.get('status') === 'scheduled';
        model.wasPublished = model.updated('status') === 'published';
        model.wasScheduled = model.updated('status') === 'scheduled';
        model.resourceTypeChanging = model.get('page') !== model.updated('page');
        model.publishedAtHasChanged = model.hasDateChanged('published_at');
        model.needsReschedule = model.publishedAtHasChanged && model.isScheduled;

        // Handle added and deleted for post -> page or page -> post
        if (model.resourceTypeChanging) {
            if (model.wasPublished) {
                model.emitChange('unpublished', Object.assign({useUpdatedAttribute: true}, options));
            }

            if (model.wasScheduled) {
                model.emitChange('unscheduled', Object.assign({useUpdatedAttribute: true}, options));
            }

            model.emitChange('deleted', Object.assign({useUpdatedAttribute: true}, options));
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
    },

    onDestroyed: function onDestroyed(model, options) {
        if (model.previous('status') === 'published') {
            model.emitChange('unpublished', Object.assign({usePreviousAttribute: true}, options));
        }

        model.emitChange('deleted', Object.assign({usePreviousAttribute: true}, options));
    },

    onSaving: function onSaving(model, attr, options) {
        options = options || {};

        var self = this,
            title,
            i,
            // Variables to make the slug checking more readable
            newTitle = this.get('title'),
            newStatus = this.get('status'),
            olderStatus = this.previous('status'),
            prevTitle = this.previous('title'),
            prevSlug = this.previous('slug'),
            publishedAt = this.get('published_at'),
            publishedAtHasChanged = this.hasDateChanged('published_at', {beforeWrite: true}),
            generatedFields = ['html', 'plaintext'],
            tagsToSave,
            ops = [];

        // CASE: disallow published -> scheduled
        // @TODO: remove when we have versioning based on updated_at
        if (newStatus !== olderStatus && newStatus === 'scheduled' && olderStatus === 'published') {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.models.post.isAlreadyPublished', {key: 'status'})
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
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('errors.models.post.valueCannotBeBlank', {key: 'published_at'})
                }));
            } else if (!moment(publishedAt).isValid()) {
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('errors.models.post.valueCannotBeBlank', {key: 'published_at'})
                }));
                // CASE: to schedule/reschedule a post, a minimum diff of x minutes is needed (default configured is 2minutes)
            } else if (
                publishedAtHasChanged &&
                moment(publishedAt).isBefore(moment().add(config.get('times').cannotScheduleAPostBeforeInMinutes, 'minutes')) &&
                !options.importing &&
                (!options.context || !options.context.internal)
            ) {
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('errors.models.post.expectedPublishedAtInFuture', {
                        cannotScheduleAPostBeforeInMinutes: config.get('times').cannotScheduleAPostBeforeInMinutes
                    })
                }));
            }
        }

        // CASE: detect lowercase/uppercase tag slugs
        if (!_.isUndefined(this.get('tags')) && !_.isNull(this.get('tags'))) {
            tagsToSave = [];

            //  and deduplicate upper/lowercase tags
            _.each(this.get('tags'), function each(item) {
                for (i = 0; i < tagsToSave.length; i = i + 1) {
                    if (tagsToSave[i].name && item.name && tagsToSave[i].name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) {
                        return;
                    }
                }

                tagsToSave.push(item);
            });

            this.set('tags', tagsToSave);
        }

        ghostBookshelf.Model.prototype.onSaving.call(this, model, attr, options);

        // do not allow generated fields to be overridden via the API
        if (!options.migrating) {
            generatedFields.forEach((field) => {
                if (this.hasChanged(field)) {
                    this.set(field, this.previous(field));
                }
            });
        }

        if (!this.get('mobiledoc')) {
            this.set('mobiledoc', JSON.stringify(converters.mobiledocConverter.blankStructure()));
        }

        // render mobiledoc to HTML
        if (this.hasChanged('mobiledoc') || !this.get('html')) {
            this.set('html', converters.mobiledocConverter.render(JSON.parse(this.get('mobiledoc'))));
        }

        if (this.hasChanged('html') || !this.get('plaintext')) {
            this.set('plaintext', htmlToText.fromString(this.get('html'), {
                wordwrap: 80,
                ignoreImage: true,
                hideLinkHrefIfSameAsText: true,
                preserveNewlines: true,
                returnDomByDefault: true,
                uppercaseHeadings: false
            }));
        }

        // disabling sanitization until we can implement a better version
        if (!options.importing) {
            title = this.get('title') || common.i18n.t('errors.models.post.untitled');
            this.set('title', _.toString(title).trim());
        }

        // ### Business logic for published_at and published_by
        // If the current status is 'published' and published_at is not set, set it to now
        if (newStatus === 'published' && !publishedAt) {
            this.set('published_at', new Date());
        }

        // If the current status is 'published' and the status has just changed ensure published_by is set correctly
        if (newStatus === 'published' && this.hasChanged('status')) {
            // unless published_by is set and we're importing, set published_by to contextUser
            if (!(this.get('published_by') && options.importing)) {
                this.set('published_by', this.contextUser(options));
            }
        } else {
            // In any other case (except import), `published_by` should not be changed
            if (this.hasChanged('published_by') && !options.importing) {
                this.set('published_by', this.previous('published_by') || null);
            }
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
                        ).then(function then(prevTitleSlug) {
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
        if (model.hasChanged('mobiledoc') && !options.importing && !options.migrating) {
            ops.push(function updateRevisions() {
                return ghostBookshelf.model('MobiledocRevision')
                    .findAll(Object.assign({
                        filter: `post_id:${model.id}`,
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

        return sequence(ops);
    },

    emptyStringProperties: function emptyStringProperties() {
        // CASE: the client might send empty image properties with "" instead of setting them to null.
        // This can cause GQL to fail. We therefore enforce 'null' for empty image properties.
        // See https://github.com/TryGhost/GQL/issues/24
        return ['feature_image', 'og_image', 'twitter_image'];
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

    fields: function fields() {
        return this.morphMany('AppField', 'relatable');
    },

    mobiledoc_revisions() {
        return this.hasMany('MobiledocRevision', 'post_id');
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
        return ['id', 'published_at', 'slug', 'author_id'];
    },
    /**
     * If the `formats` option is not used, we return `html` be default.
     * Otherwise we return what is requested e.g. `?formats=mobiledoc,plaintext`
     */
    formatsToJSON: function formatsToJSON(attrs, options) {
        var defaultFormats = ['html'],
            formatsToKeep = options.formats || defaultFormats;

        // Iterate over all known formats, and if they are not in the keep list, remove them
        _.each(Post.allowedFormats, function (format) {
            if (formatsToKeep.indexOf(format) === -1) {
                delete attrs[format];
            }
        });

        return attrs;
    },

    toJSON: function toJSON(unfilteredOptions) {
        var options = Post.filterOptions(unfilteredOptions, 'toJSON'),
            attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        attrs = this.formatsToJSON(attrs, options);

        // CASE: never expose the revisions
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
    enforcedFilters: function enforcedFilters(options) {
        return options.context && options.context.public ? 'status:published' : null;
    },
    defaultFilters: function defaultFilters(options) {
        if (options.context && options.context.internal) {
            return null;
        }

        return options.context && options.context.public ? 'page:false' : 'page:false+status:published';
    },

    /**
     * You can pass an extra `status=VALUES` or "staticPages" field.
     * Long-Term: We should deprecate these short cuts and force users to use the filter param.
     */
    extraFilters: function extraFilters(options) {
        if (!options.staticPages && !options.status) {
            return null;
        }

        let filter = null;

        // CASE: "staticPages" is passed
        if (options.staticPages && options.staticPages !== 'all') {
            // CASE: convert string true/false to boolean
            if (!_.isBoolean(options.staticPages)) {
                options.staticPages = _.includes(['true', '1'], options.staticPages);
            }

            filter = `page:${options.staticPages}`;
        } else if (options.staticPages === 'all') {
            filter = 'page:[true, false]';
        }

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
        delete options.staticPages;
        return filter;
    }
}, {
    allowedFormats: ['mobiledoc', 'html', 'plaintext'],

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
            order = `count(tags.id) DESC, ${order}`;
        }

        // CASE: if the filter contains an `IN` operator, we should return the posts first, which match both authors
        if (options.filter && options.filter.match(/(authors|author):\s?\[.*\]/)) {
            order = `count(authors.id) DESC, ${order}`;
        }

        return order;
    },

    /**
     * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Array} Keys allowed in the `options` hash of the model's method.
     */
    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions.call(this, methodName),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['columns', 'importing', 'withRelated', 'require'],
                findPage: ['page', 'limit', 'columns', 'filter', 'order', 'status', 'staticPages'],
                findAll: ['columns', 'filter'],
                destroy: ['destroyAll']
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
     */
    defaultRelations: function defaultRelations(methodName, options) {
        if (['edit', 'add'].indexOf(methodName) !== -1) {
            options.withRelated = _.union(['authors', 'tags'], options.withRelated || []);
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
        var filteredData = ghostBookshelf.Model.filterData.apply(this, arguments),
            extraData = _.pick(data, this.prototype.relationships);

        _.merge(filteredData, extraData);
        return filteredData;
    },

    removeInvisibleUnicode: function removeInvisibleUnicode(str) {
        // eslint-disable-next-line
        const re = /[\0-\x1F\x7F-\x9F\xAD\u0378\u0379\u037F-\u0383\u038B\u038D\u03A2\u0528-\u0530\u0557\u0558\u0560\u0588\u058B-\u058E\u0590\u05C8-\u05CF\u05EB-\u05EF\u05F5-\u0605\u061C\u061D\u06DD\u070E\u070F\u074B\u074C\u07B2-\u07BF\u07FB-\u07FF\u082E\u082F\u083F\u085C\u085D\u085F-\u089F\u08A1\u08AD-\u08E3\u08FF\u0978\u0980\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09FC-\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A76-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF2-\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B55\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B78-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BFB-\u0C00\u0C04\u0C0D\u0C11\u0C29\u0C34\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5A-\u0C5F\u0C64\u0C65\u0C70-\u0C77\u0C80\u0C81\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0D01\u0D04\u0D0D\u0D11\u0D3B\u0D3C\u0D45\u0D49\u0D4F-\u0D56\u0D58-\u0D5F\u0D64\u0D65\u0D76-\u0D78\u0D80\u0D81\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DF1\u0DF5-\u0E00\u0E3B-\u0E3E\u0E5C-\u0E80\u0E83\u0E85\u0E86\u0E89\u0E8B\u0E8C\u0E8E-\u0E93\u0E98\u0EA0\u0EA4\u0EA6\u0EA8\u0EA9\u0EAC\u0EBA\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F48\u0F6D-\u0F70\u0F98\u0FBD\u0FCD\u0FDB-\u0FFF\u10C6\u10C8-\u10CC\u10CE\u10CF\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u137D-\u137F\u139A-\u139F\u13F5-\u13FF\u169D-\u169F\u16F1-\u16FF\u170D\u1715-\u171F\u1737-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17DE\u17DF\u17EA-\u17EF\u17FA-\u17FF\u180F\u181A-\u181F\u1878-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191D-\u191F\u192C-\u192F\u193C-\u193F\u1941-\u1943\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19DD\u1A1C\u1A1D\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1A9F\u1AAE-\u1AFF\u1B4C-\u1B4F\u1B7D-\u1B7F\u1BF4-\u1BFB\u1C38-\u1C3A\u1C4A-\u1C4C\u1C80-\u1CBF\u1CC8-\u1CCF\u1CF7-\u1CFF\u1DE7-\u1DFB\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FC5\u1FD4\u1FD5\u1FDC\u1FF0\u1FF1\u1FF5\u1FFF\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2072\u2073\u208F\u209D-\u209F\u20BB-\u20CF\u20F1-\u20FF\u218A-\u218F\u23F4-\u23FF\u2427-\u243F\u244B-\u245F\u2700\u2B4D-\u2B4F\u2B5A-\u2BFF\u2C2F\u2C5F\u2CF4-\u2CF8\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D71-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E3C-\u2E7F\u2E9A\u2EF4-\u2EFF\u2FD6-\u2FEF\u2FFC-\u2FFF\u3040\u3097\u3098\u3100-\u3104\u312E-\u3130\u318F\u31BB-\u31BF\u31E4-\u31EF\u321F\u32FF\u4DB6-\u4DBF\u9FCD-\u9FFF\uA48D-\uA48F\uA4C7-\uA4CF\uA62C-\uA63F\uA698-\uA69E\uA6F8-\uA6FF\uA78F\uA794-\uA79F\uA7AB-\uA7F7\uA82C-\uA82F\uA83A-\uA83F\uA878-\uA87F\uA8C5-\uA8CD\uA8DA-\uA8DF\uA8FC-\uA8FF\uA954-\uA95E\uA97D-\uA97F\uA9CE\uA9DA-\uA9DD\uA9E0-\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A\uAA5B\uAA7C-\uAA7F\uAAC3-\uAADA\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F-\uABBF\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBC2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFE\uFDFF\uFE1A-\uFE1F\uFE27-\uFE2F\uFE53\uFE67\uFE6C-\uFE6F\uFE75\uFEFD-\uFF00\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFDF\uFFE7\uFFEF-\uFFFB\uFFFE\uFFFF]/g;
        return str.replace(re, '');
    },

    // ## Model Data Functions

    /**
     * ### Find One
     * @extends ghostBookshelf.Model.findOne to handle post status
     * **See:** [ghostBookshelf.Model.findOne](base.js.html#Find%20One)
     */
    findOne: function findOne(data, options) {
        data = _.defaults(data || {}, {
            status: 'published'
        });

        if (data.status === 'all') {
            delete data.status;
        }

        return ghostBookshelf.Model.findOne.call(this, data, options);
    },

    /**
     * ### Edit
     * Fetches and saves to Post. See model.Base.edit
     *
     * @extends ghostBookshelf.Model.edit to handle returning the full object and manage _updatedAttributes
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
                                found._updatedAttributes = post._updatedAttributes;
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

    /**
     * ### Add
     * @extends ghostBookshelf.Model.add to handle returning the full object
     * **See:** [ghostBookshelf.Model.add](base.js.html#add)
     */
    add: function add(data, unfilteredOptions) {
        let options = this.filterOptions(unfilteredOptions, 'add', {extraAllowedProperties: ['id']});

        if (data.slug) {
            data.slug = this.removeInvisibleUnicode(data.slug);
        }

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

    // NOTE: the `authors` extension is the parent of the post model. It also has a permissible function.
    permissible: function permissible(postModel, action, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasAppPermission) {
        let isContributor, isEdit, isAdd, isDestroy;

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
        isEdit = (action === 'edit');
        isAdd = (action === 'add');
        isDestroy = (action === 'destroy');

        if (isContributor && isEdit) {
            // Only allow contributor edit if status is changing, and the post is a draft post
            hasUserPermission = !isChanging('status') && isDraft();
        } else if (isContributor && isAdd) {
            // If adding, make sure it's a draft post and has the correct ownership
            hasUserPermission = !isPublished();
        } else if (isContributor && isDestroy) {
            // If destroying, only allow contributor to destroy their own draft posts
            hasUserPermission = isDraft();
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

        if (hasUserPermission && hasAppPermission) {
            return Promise.resolve({excludedAttrs});
        }

        return Promise.reject(new common.errors.NoPermissionError({
            message: common.i18n.t('errors.models.post.notEnoughPermission')
        }));
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
