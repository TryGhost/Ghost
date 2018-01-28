'use strict';

// # Post Model
var _ = require('lodash'),
    uuid = require('uuid'),
    moment = require('moment'),
    Promise = require('bluebird'),
    ObjectId = require('bson-objectid'),
    sequence = require('../lib/promise/sequence'),
    common = require('../lib/common'),
    htmlToText = require('html-to-text'),
    ghostBookshelf = require('./base'),
    config = require('../config'),
    converters = require('../lib/mobiledoc/converters'),
    urlService = require('../services/url'),
    Post,
    Posts;

Post = ghostBookshelf.Model.extend({

    tableName: 'posts',

    /**
     * ## NOTE:
     * We define the defaults on the schema (db) and model level.
     * When inserting resources, the defaults are available **after** calling `.save`.
     * But they are available when the model hooks are triggered (e.g. onSaving).
     * It might be useful to keep them in the model layer for any connected logic.
     *
     * e.g. if `model.get('status') === draft; do something;
     */
    defaults: function defaults() {
        return {
            uuid: uuid.v4(),
            status: 'draft'
        };
    },

    relationships: ['tags'],

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
        options = options || {};

        var resourceType = this.get('page') ? 'page' : 'post';

        if (options.usePreviousResourceType) {
            resourceType = this.updated('page') ? 'page' : 'post';
        }

        common.events.emit(resourceType + '.' + event, this, options);
    },

    /**
     * We update the tags after the Post was inserted.
     * We update the tags before the Post was updated, see `onSaving` event.
     * `onCreated` is called before `onSaved`.
     */
    onCreated: function onCreated(model, response, options) {
        var status = model.get('status');

        model.emitChange('added');

        if (['published', 'scheduled'].indexOf(status) !== -1) {
            model.emitChange(status, {importing: options.importing});
        }
    },

    onUpdated: function onUpdated(model) {
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
                model.emitChange('unpublished', {usePreviousResourceType: true});
            }

            if (model.wasScheduled) {
                model.emitChange('unscheduled', {usePreviousResourceType: true});
            }

            model.emitChange('deleted', {usePreviousResourceType: true});
            model.emitChange('added');

            if (model.isPublished) {
                model.emitChange('published');
            }

            if (model.isScheduled) {
                model.emitChange('scheduled');
            }
        } else {
            if (model.statusChanging) {
                // CASE: was published before and is now e.q. draft or scheduled
                if (model.wasPublished) {
                    model.emitChange('unpublished');
                }

                // CASE: was draft or scheduled before and is now e.q. published
                if (model.isPublished) {
                    model.emitChange('published');
                }

                // CASE: was draft or published before and is now e.q. scheduled
                if (model.isScheduled) {
                    model.emitChange('scheduled');
                }

                // CASE: from scheduled to something
                if (model.wasScheduled && !model.isScheduled && !model.isPublished) {
                    model.emitChange('unscheduled');
                }
            } else {
                if (model.isPublished) {
                    model.emitChange('published.edited');
                }

                if (model.needsReschedule) {
                    model.emitChange('rescheduled');
                }
            }

            // Fire edited if this wasn't a change between resourceType
            model.emitChange('edited');
        }
    },

    onDestroying: function onDestroying(model) {
        if (model.previous('status') === 'published') {
            model.emitChange('unpublished');
        }

        model.emitChange('deleted');
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
            prevTitle = this._previousAttributes.title,
            prevSlug = this._previousAttributes.slug,
            publishedAt = this.get('published_at'),
            publishedAtHasChanged = this.hasDateChanged('published_at', {beforeWrite: true}),
            mobiledoc = this.get('mobiledoc'),
            tagsToSave,
            ops = [];

        // CASE: disallow published -> scheduled
        // @TODO: remove when we have versioning based on updated_at
        if (newStatus !== olderStatus && newStatus === 'scheduled' && olderStatus === 'published') {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.models.post.isAlreadyPublished', {key: 'status'})
            }));
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
                !options.importing
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

        if (mobiledoc) {
            this.set('html', converters.mobiledocConverter.render(JSON.parse(mobiledoc)));
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
                this.set('published_by', this.previous('published_by'));
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

        return sequence(ops);
    },

    onCreating: function onCreating(model, attr, options) {
        options = options || {};

        // set any dynamic default properties
        if (!this.get('author_id')) {
            this.set('author_id', this.contextUser(options));
        }

        ghostBookshelf.Model.prototype.onCreating.call(this, model, attr, options);
    },

    // Relations
    author: function author() {
        return this.belongsTo('User', 'author_id');
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

    tags: function tags() {
        return this.belongsToMany('Tag', 'posts_tags', 'post_id', 'tag_id')
            .withPivot('sort_order')
            .query('orderBy', 'sort_order', 'ASC');
    },

    fields: function fields() {
        return this.morphMany('AppField', 'relatable');
    },

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
            attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options),
            oldPostId = attrs.amp,
            commentId;

        attrs = this.formatsToJSON(attrs, options);

        if (!options.columns || (options.columns && options.columns.indexOf('author') > -1)) {
            attrs.author = attrs.author || attrs.author_id;
            delete attrs.author_id;
        }
        // If the current column settings allow it...
        if (!options.columns || (options.columns && options.columns.indexOf('primary_tag') > -1)) {
            // ... attach a computed property of primary_tag which is the first tag if it is public, else null
            if (attrs.tags && attrs.tags.length > 0 && attrs.tags[0].visibility === 'public') {
                attrs.primary_tag = attrs.tags[0];
            } else {
                attrs.primary_tag = null;
            }
        }

        if (!options.columns || (options.columns && options.columns.indexOf('url') > -1)) {
            attrs.url = urlService.utils.urlPathForPost(attrs);
        }

        if (oldPostId) {
            // CASE: You create a new post on 1.X, you enable disqus. You export your content, you import your content on a different instance.
            // This time, the importer remembers your old post id in the amp field as ObjectId.
            if (ObjectId.isValid(oldPostId)) {
                commentId = oldPostId;
            } else {
                oldPostId = Number(oldPostId);

                // CASE: You import an old post id from your LTS blog. Stored in the amp field.
                if (!isNaN(oldPostId)) {
                    commentId = oldPostId.toString();
                } else {
                    commentId = attrs.id;
                }
            }
        } else {
            commentId = attrs.id;
        }

        // NOTE: we remember the old post id because of disqus
        attrs.comment_id = commentId;

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
    }
}, {
    allowedFormats: ['mobiledoc', 'html', 'plaintext', 'amp'],

    orderDefaultOptions: function orderDefaultOptions() {
        return {
            status: 'ASC',
            published_at: 'DESC',
            updated_at: 'DESC',
            id: 'DESC'
        };
    },

    orderDefaultRaw: function () {
        return '' +
            'CASE WHEN posts.status = \'scheduled\' THEN 1 ' +
            'WHEN posts.status = \'draft\' THEN 2 ' +
            'ELSE 3 END ASC,' +
            'posts.published_at DESC,' +
            'posts.updated_at DESC,' +
            'posts.id DESC';
    },

    /**
     * @deprecated in favour of filter
     */
    processOptions: function processOptions(options) {
        if (!options.staticPages && !options.status) {
            return options;
        }

        // This is the only place that 'options.where' is set now
        options.where = {statements: []};

        // Step 4: Setup filters (where clauses)
        if (options.staticPages && options.staticPages !== 'all') {
            // convert string true/false to boolean
            if (!_.isBoolean(options.staticPages)) {
                options.staticPages = _.includes(['true', '1'], options.staticPages);
            }
            options.where.statements.push({prop: 'page', op: '=', value: options.staticPages});
            delete options.staticPages;
        } else if (options.staticPages === 'all') {
            options.where.statements.push({prop: 'page', op: 'IN', value: [true, false]});
            delete options.staticPages;
        }

        // Unless `all` is passed as an option, filter on
        // the status provided.
        if (options.status && options.status !== 'all') {
            // make sure that status is valid
            options.status = _.includes(['published', 'draft', 'scheduled'], options.status) ? options.status : 'published';
            options.where.statements.push({prop: 'status', op: '=', value: options.status});
            delete options.status;
        } else if (options.status === 'all') {
            options.where.statements.push({prop: 'status', op: 'IN', value: ['published', 'draft', 'scheduled']});
            delete options.status;
        }

        return options;
    },

    /**
     * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Array} Keys allowed in the `options` hash of the model's method.
     */
    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['columns', 'importing', 'withRelated', 'require'],
                findPage: ['page', 'limit', 'columns', 'filter', 'order', 'status', 'staticPages'],
                findAll: ['columns', 'filter']
            };

        // The post model additionally supports having a formats option
        options.push('formats');

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
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
                    return this.findOne({status: 'all', id: options.id}, options)
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

        const addPost = (() => {
            return ghostBookshelf.Model.add.call(this, data, options)
                .then((post) => {
                    return this.findOne({status: 'all', id: post.id}, options);
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

    /**
     * ### destroyByAuthor
     * @param  {[type]} options has context and id. Context is the user doing the destroy, id is the user to destroy
     */
    destroyByAuthor: function destroyByAuthor(unfilteredOptions) {
        let options = this.filterOptions(unfilteredOptions, 'destroyByAuthor', {extraAllowedProperties: ['id']}),
            postCollection = Posts.forge(),
            authorId = options.id;

        if (!authorId) {
            throw new common.errors.NotFoundError({
                message: common.i18n.t('errors.models.post.noUserFound')
            });
        }

        const destroyPost = (() => {
            return postCollection
                .query('where', 'author_id', '=', authorId)
                .fetch(options)
                .call('invokeThen', 'destroy', options)
                .catch((err) => {
                    throw new common.errors.GhostError({err: err});
                });
        });

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;
                return destroyPost();
            });
        }

        return destroyPost();
    },

    permissible: function permissible(postModelOrId, action, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasAppPermission) {
        var self = this,
            postModel = postModelOrId,
            result = {},
            origArgs, isContributor, isAuthor, isEdit, isAdd, isDestroy;

        // If we passed in an id instead of a model, get the model
        // then check the permissions
        if (_.isNumber(postModelOrId) || _.isString(postModelOrId)) {
            // Grab the original args without the first one
            origArgs = _.toArray(arguments).slice(1);

            // Get the actual post model
            return this.findOne({id: postModelOrId, status: 'all'}).then(function then(foundPostModel) {
                // Build up the original args but substitute with actual model
                var newArgs = [foundPostModel].concat(origArgs);

                return self.permissible.apply(self, newArgs);
            });
        }

        function isChanging(attr) {
            return unsafeAttrs[attr] && unsafeAttrs[attr] !== postModel.get(attr);
        }

        function isOwner() {
            return unsafeAttrs.author_id && unsafeAttrs.author_id === context.user;
        }

        function isCurrentOwner() {
            return context.user === postModel.get('author_id');
        }

        function isPublished() {
            return unsafeAttrs.status && unsafeAttrs.status !== 'draft';
        }

        function isDraft() {
            return postModel.get('status') === 'draft';
        }

        isContributor = loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Contributor'});
        isAuthor = loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Author'});
        isEdit = (action === 'edit');
        isAdd = (action === 'add');
        isDestroy = (action === 'destroy');

        if (isContributor && isEdit) {
            // Only allow contributor edit if neither status or author id are changing, and the post is a draft post
            hasUserPermission = !isChanging('status') && !isChanging('author_id') && isDraft() && isCurrentOwner();
        } else if (isContributor && isAdd) {
            // If adding, make sure it's a draft post and has the correct ownership
            hasUserPermission = !isPublished() && isOwner();
        } else if (isContributor && isDestroy) {
            // If destroying, only allow contributor to destroy their own draft posts
            hasUserPermission = isCurrentOwner() && isDraft();
        } else if (isAuthor && isEdit) {
            // Don't allow author to change author ids
            hasUserPermission = isCurrentOwner() && !isChanging('author_id');
        } else if (isAuthor && isAdd) {
            // Make sure new post is authored by the current user
            hasUserPermission = isOwner();
        } else if (postModel) {
            hasUserPermission = hasUserPermission || isCurrentOwner();
        }

        if (isContributor) {
            // Note: at the moment primary_tag is a computed field,
            // meaning we don't add it to this list. However, if the primary_tag
            // ever becomes a db field rather than a computed field, add it to this list
            //
            // TODO: once contribitors are able to edit existing tags, this can be removed
            result.excludedAttrs = ['tags'];
        }

        if (hasUserPermission && hasAppPermission) {
            return Promise.resolve(result);
        }

        return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.models.post.notEnoughPermission')}));
    }
});

Posts = ghostBookshelf.Collection.extend({
    model: Post
});

module.exports = {
    Post: ghostBookshelf.model('Post', Post),
    Posts: ghostBookshelf.collection('Posts', Posts)
};
