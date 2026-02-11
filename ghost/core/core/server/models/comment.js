const ghostBookshelf = require('./base');
const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const {ValidationError} = require('@tryghost/errors');
const cursorUtils = require('../services/comments/cursor-utils');

const messages = {
    emptyComment: 'The body of a comment cannot be empty'
};

/**
 * Remove empty paragraps from the start and end
 * + remove duplicate empty paragrapsh (only one empty line allowed)
 */
function trimParagraphs(str) {
    const paragraph = '<p></p>';
    const escapedParagraph = '<p>\\s*?</p>';

    const startReg = new RegExp('^(' + escapedParagraph + ')+');
    const endReg = new RegExp('(' + escapedParagraph + ')+$');
    const duplicates = new RegExp('(' + escapedParagraph + ')+');
    return str.replace(startReg, '').replace(endReg, '').replace(duplicates, paragraph);
}

const Comment = ghostBookshelf.Model.extend({
    tableName: 'comments',

    defaults: function defaults() {
        return {
            status: 'published'
        };
    },

    post() {
        return this.belongsTo('Post', 'post_id');
    },

    member() {
        return this.belongsTo('Member', 'member_id');
    },

    parent() {
        return this.belongsTo('Comment', 'parent_id');
    },

    in_reply_to() {
        return this.belongsTo('Comment', 'in_reply_to_id');
    },

    likes() {
        return this.hasMany('CommentLike', 'comment_id');
    },

    replies() {
        return this.hasMany('Comment', 'parent_id', 'id')
            .query('orderBy', 'created_at', 'ASC')
            // Note: this limit is not working
            .query('limit', 3);
    },

    // Called by our filtered-collection bookshelf plugin
    applyCustomQuery(options) {
        const excludedStatuses = options.isAdmin ? ['deleted'] : ['hidden', 'deleted'];

        this.query((qb) => {
            if (options.browseAll) {
                // Browse All: simply exclude statuses, no thread structure preservation
                qb.whereNotIn('comments.status', excludedStatuses);
            } else {
                // Default: preserve thread structure by including deleted parents with replies
                qb.where(function () {
                    this.whereNotIn('comments.status', excludedStatuses)
                        .orWhereExists(function () {
                            this.select(1)
                                .from('comments as replies')
                                .whereRaw('replies.parent_id = comments.id')
                                .whereNotIn('replies.status', excludedStatuses);
                        });
                });
            }

            // Filter by report count (extracted from filter in controller)
            if (options.reportCount !== undefined) {
                const subquery = '(SELECT COUNT(*) FROM comment_reports WHERE comment_reports.comment_id = comments.id)';
                qb.whereRaw(`${subquery} ${options.reportCount.op} ?`, [options.reportCount.value]);
            }
        });
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'comment' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onSaving() {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (this.hasChanged('html')) {
            const sanitizeHtml = require('sanitize-html');

            const html = trimParagraphs(
                sanitizeHtml(this.get('html'), {
                    allowedTags: ['p', 'br', 'a', 'blockquote'],
                    allowedAttributes: {
                        a: ['href', 'target', 'rel']
                    },
                    selfClosing: ['br'],
                    // Enforce _blank and safe URLs
                    transformTags: {
                        a: sanitizeHtml.simpleTransform('a', {
                            target: '_blank',
                            rel: 'ugc noopener noreferrer nofollow'
                        })
                    }
                })
            ).trim();

            if (html.length === 0) {
                throw new ValidationError({
                    message: tpl(messages.emptyComment)
                });
            }
            this.set('html', html);
        }
    },

    orderAttributes: function orderAttributes() {
        let keys = ghostBookshelf.Model.prototype.orderAttributes.call(this, arguments);
        keys.push('count__likes');
        keys.push('count__reports');
        return keys;
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    enforcedFilters: function enforcedFilters(options) {
        // Convenience option to merge all filters with parent_id:null filter
        if (options.parentId !== undefined) {
            if (options.parentId === null) {
                return 'parent_id:null';
            }
            return 'parent_id:\'' + options.parentId + '\'';
        }

        return null;
    }
}, {

    destroy: function destroy(unfilteredOptions) {
        let options = this.filterOptions(unfilteredOptions, 'destroy', {extraAllowedProperties: ['id']});

        const softDelete = () => {
            return ghostBookshelf.Model.edit.call(this, {status: 'deleted'}, options);
        };

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;
                return softDelete();
            });
        }

        return softDelete();
    },

    applyRepliesWithRelatedOption(withRelated, isAdmin) {
        // we want to apply filters when fetching replies so we don't expose data that should be hidden
        // - public requests never return hidden or deleted replies
        // - admin requests never return deleted replies but do return hidden replies
        const repliesOptionIndex = withRelated.indexOf('replies');
        if (repliesOptionIndex > -1) {
            withRelated[repliesOptionIndex] = {
                replies: (qb) => {
                    if (isAdmin) {
                        qb.where('status', '!=', 'deleted');
                    } else {
                        qb.where('status', 'published');
                    }
                }
            };
        }
    },

    /**
     * We have to ensure consistency. If you listen on model events (e.g. `member.added`), you can expect that you always
     * receive all fields including relations. Otherwise you can't rely on a consistent flow. And we want to avoid
     * that event listeners have to re-fetch a resource.
     */
    defaultRelations: function defaultRelations(methodName, options) {
        // @TODO: the default relations are not working for 'add' when we add it below
        // this is because bookshelf does not automatically call `fetch` after adding so
        // our bookshelf eager-load plugin doesn't use the `withRelated` options
        if (['findAll', 'findPage', 'edit', 'findOne', 'destroy'].indexOf(methodName) !== -1) {
            if (!options.withRelated || options.withRelated.length === 0) {
                if (options.parentId) {
                    // Do not include replies for replies
                    options.withRelated = [
                        // Relations
                        'in_reply_to', 'member', 'count.direct_replies', 'count.likes', 'count.liked'
                    ];

                    // Add count.reports for admin requests only
                    if (options.isAdmin) {
                        options.withRelated.push('count.reports');
                    }
                } else {
                    options.withRelated = [
                        // Relations
                        'member', 'in_reply_to', 'count.replies', 'count.direct_replies', 'count.likes', 'count.liked',
                        // Replies (limited to 3)
                        'replies', 'replies.member', 'replies.in_reply_to',
                        'replies.count.direct_replies', 'replies.count.likes', 'replies.count.liked'
                    ];

                    // Add count.reports for admin requests only
                    if (options.isAdmin) {
                        options.withRelated.push('count.reports');
                        options.withRelated.push('replies.count.reports');
                    }
                }
            }

            this.applyRepliesWithRelatedOption(options.withRelated, options.isAdmin);
        }

        return options;
    },

    async findPage(options) {
        const {withRelated} = this.defaultRelations('findPage', options);

        const relationsToLoadIndividually = [
            'replies',
            'replies.member',
            'replies.in_reply_to',
            'replies.count.direct_replies',
            'replies.count.likes',
            'replies.count.liked'
        ].filter(relation => (withRelated.includes(relation) || withRelated.some(r => typeof r === 'object' && r[relation])));

        this.applyRepliesWithRelatedOption(relationsToLoadIndividually, options.isAdmin);

        const result = await ghostBookshelf.Model.findPage.call(this, options);
        for (const model of result.data) {
            await model.load(relationsToLoadIndividually, _.omit(options, 'withRelated'));
        }
        return result;
    },

    /**
     * Cursor-based pagination for comments. Uses keyset conditions instead of
     * OFFSET/LIMIT for stable, efficient pagination.
     *
     * @param {Object} unfilteredOptions
     * @param {string} [unfilteredOptions.after] - Cursor for forward pagination
     * @param {string} [unfilteredOptions.before] - Cursor for backward pagination
     * @param {string} [unfilteredOptions.order] - Order string (e.g. 'created_at DESC, id DESC')
     * @param {number} [unfilteredOptions.limit] - Items per page
     * @returns {Promise<{data: Array, meta: {pagination: Object}}>}
     */
    async findPageByCursor(unfilteredOptions) {
        const options = this.filterOptions(unfilteredOptions, 'findPage');
        this.defaultRelations('findPage', options);
        const {withRelated} = options;

        const relationsToLoadIndividually = [
            'replies',
            'replies.member',
            'replies.in_reply_to',
            'replies.count.direct_replies',
            'replies.count.likes',
            'replies.count.liked'
        ].filter(relation => (withRelated && (withRelated.includes(relation) || withRelated.some(r => typeof r === 'object' && r[relation]))));

        this.applyRepliesWithRelatedOption(relationsToLoadIndividually, options.isAdmin);

        // Parse order and ensure id tiebreaker
        const orderString = options.order || 'created_at DESC, id DESC';
        const parsedOrder = cursorUtils.ensureIdTiebreaker(cursorUtils.parseOrder(orderString));

        const limit = parseInt(options.limit, 10) || 15;
        const afterCursor = options.after;
        const beforeCursor = options.before;

        // Build base filtered collection (applies status filters, NQL filters, etc.)
        const itemCollection = this.getFilteredCollection(options);

        // Parse order for bookshelf (needed for the SELECT to include count columns)
        if (options.order) {
            const {order, orderRaw, eagerLoad} = itemCollection.parseOrderOption(options.order, options.withRelated);
            options.orderRaw = orderRaw;
            options.order = order;
            options.eagerLoad = eagerLoad;
        }

        // Build the count__likes subquery SQL for use in keyset conditions
        const likesSubquery = '(SELECT COUNT(comment_likes.id) FROM comment_likes WHERE comment_likes.comment_id = comments.id)';

        // Apply keyset WHERE clause if we have a cursor
        if (afterCursor || beforeCursor) {
            const cursor = afterCursor || beforeCursor;
            const direction = afterCursor ? 'after' : 'before';
            const cursorValues = cursorUtils.decodeCursor(cursor);
            const {sql, bindings} = cursorUtils.buildKeysetCondition(cursorValues, parsedOrder, direction);

            // Replace count__likes references with the actual subquery
            const resolvedSql = sql.replace(/\bcount__likes\b/g, likesSubquery);

            itemCollection.query((qb) => {
                qb.whereRaw(`(${resolvedSql})`, bindings);
            });
        }

        // Apply ordering
        for (const {field, direction} of parsedOrder) {
            if (field === 'count__likes') {
                itemCollection.query((qb) => {
                    qb.orderByRaw(`${likesSubquery} ${direction}`);
                });
            } else {
                itemCollection.query('orderBy', field === 'id' ? 'comments.id' : field, direction);
            }
        }

        // For 'before' direction, we fetch in reverse order and then reverse the results
        // so the items are returned in the correct display order
        const isBefore = !!beforeCursor;
        if (isBefore) {
            // Reverse the ordering for the query to get the correct items
            // (we want items that come "before" the cursor in display order,
            // which means items that come "after" it in reverse order)
            // The keyset condition already handles the comparison direction,
            // but we need to reverse the ORDER BY to get the right N items
            // closest to the cursor. Then we reverse the results.
            // Actually, buildKeysetCondition already flips comparisons for 'before',
            // so we just need to reverse the result order at the end.
        }

        // Apply limit (fetch one extra to detect if there's a next page)
        itemCollection.query('limit', limit + 1);

        // Count query (parallel to fetch)
        const countQuery = itemCollection.query().clone();
        countQuery.clear('select');
        countQuery.clear('order');
        countQuery.clear('limit');
        countQuery.clear('offset');
        const countPromise = countQuery.select(
            ghostBookshelf.knex.raw('count(distinct comments.id) as aggregate')
        );

        // Fetch results
        const fetchOptions = _.omit(options, ['page', 'limit', 'after', 'before', 'anchor', 'order']);
        const fetchResult = await itemCollection.fetchAll(fetchOptions);
        const countResult = await countPromise;

        let models = fetchResult.models || [];
        const hasExtra = models.length > limit;

        // Trim to requested limit
        if (hasExtra) {
            models = models.slice(0, limit);
        }

        // For 'before' queries, reverse the results back to display order
        if (isBefore) {
            models.reverse();
        }

        // Load reply relations individually (same pattern as findPage)
        for (const model of models) {
            await model.load(relationsToLoadIndividually, _.omit(options, 'withRelated'));
        }

        // Build cursor strings for next/prev
        let nextCursor = null;
        let prevCursor = null;

        if (models.length > 0) {
            // next: if we had extra results, there are more items after
            if (afterCursor || (!afterCursor && !beforeCursor)) {
                // Forward pagination or initial page
                if (hasExtra) {
                    const lastModel = models[models.length - 1];
                    nextCursor = cursorUtils.encodeCursor(
                        cursorUtils.extractCursorValues(lastModel, parsedOrder)
                    );
                }
            }
            if (beforeCursor) {
                // Backward pagination: there may be more items before
                if (hasExtra) {
                    const firstModel = models[0];
                    prevCursor = cursorUtils.encodeCursor(
                        cursorUtils.extractCursorValues(firstModel, parsedOrder)
                    );
                }
            }

            // If we used an 'after' cursor, there are items before us (prev)
            if (afterCursor) {
                const firstModel = models[0];
                prevCursor = cursorUtils.encodeCursor(
                    cursorUtils.extractCursorValues(firstModel, parsedOrder)
                );
            }

            // If we used a 'before' cursor, there are items after us (next)
            if (beforeCursor) {
                const lastModel = models[models.length - 1];
                nextCursor = cursorUtils.encodeCursor(
                    cursorUtils.extractCursorValues(lastModel, parsedOrder)
                );
            }
        }

        const total = countResult[0] ? countResult[0].aggregate : 0;

        return {
            data: models,
            meta: {
                pagination: {
                    limit,
                    total,
                    next: nextCursor,
                    prev: prevCursor,
                    page: null,
                    pages: null
                }
            }
        };
    },

    /**
     * Anchor-based pagination: fetches a window of items centered around a
     * specific comment. Returns items before and after the anchor with cursors
     * for paginating in both directions.
     *
     * @param {string} anchorId - Comment ID to center results around
     * @param {Object} unfilteredOptions
     * @returns {Promise<{data: Array, meta: {pagination: Object, anchor: Object}}>}
     */
    async findPageAroundAnchor(anchorId, unfilteredOptions) {
        const options = this.filterOptions(unfilteredOptions, 'findPage');
        this.defaultRelations('findPage', options);
        const {withRelated} = options;

        const relationsToLoadIndividually = [
            'replies',
            'replies.member',
            'replies.in_reply_to',
            'replies.count.direct_replies',
            'replies.count.likes',
            'replies.count.liked'
        ].filter(relation => (withRelated && (withRelated.includes(relation) || withRelated.some(r => typeof r === 'object' && r[relation]))));

        this.applyRepliesWithRelatedOption(relationsToLoadIndividually, options.isAdmin);

        const orderString = options.order || 'created_at DESC, id DESC';
        const parsedOrder = cursorUtils.ensureIdTiebreaker(cursorUtils.parseOrder(orderString));
        const limit = parseInt(options.limit, 10) || 15;

        // Fetch the anchor comment to get its sort key values
        const anchorModel = await ghostBookshelf.Model.findOne.call(this, {id: anchorId}, {
            ..._.omit(options, ['page', 'limit', 'after', 'before', 'anchor', 'order', 'filter', 'withRelated']),
            require: false
        });

        if (!anchorModel) {
            // Anchor not found — fall back to first page
            const firstPage = await this.findPageByCursor(unfilteredOptions);
            firstPage.meta.anchor = {
                id: anchorId,
                found: false,
                index: null
            };
            return firstPage;
        }

        // Extract the anchor's sort key values
        // For count__likes, we need to fetch it separately since findOne doesn't include computed columns
        const anchorValues = {};
        for (const {field} of parsedOrder) {
            if (field === 'count__likes') {
                // Query the like count for the anchor comment
                const likeCount = await ghostBookshelf.knex('comment_likes')
                    .where('comment_id', anchorId)
                    .count('id as count')
                    .first();
                anchorValues[field] = likeCount ? likeCount.count : 0;
            } else {
                const value = anchorModel.get(field);
                if (field === 'created_at' && value instanceof Date) {
                    anchorValues[field] = value.toISOString();
                } else {
                    anchorValues[field] = value;
                }
            }
        }

        const anchorCursor = cursorUtils.encodeCursor(anchorValues);

        // Fetch items before the anchor (half the limit)
        const halfLimit = Math.ceil(limit / 2);
        const beforeOptions = {
            ...unfilteredOptions,
            before: anchorCursor,
            limit: halfLimit,
            anchor: undefined
        };
        const beforeResult = await this.findPageByCursor(beforeOptions);

        // Fetch items after the anchor (remaining limit)
        const afterLimit = limit - beforeResult.data.length - 1; // -1 for the anchor itself
        let afterModels = [];
        if (afterLimit > 0) {
            const afterOptions = {
                ...unfilteredOptions,
                after: anchorCursor,
                limit: afterLimit,
                anchor: undefined
            };
            const afterResult = await this.findPageByCursor(afterOptions);
            afterModels = afterResult.data;
        }

        // Load the anchor model with full relations
        const anchorWithRelations = await ghostBookshelf.Model.findOne.call(this, {id: anchorId}, {
            ..._.omit(options, ['page', 'limit', 'after', 'before', 'anchor', 'order', 'filter']),
            require: false
        });

        if (anchorWithRelations) {
            await anchorWithRelations.load(relationsToLoadIndividually, _.omit(options, 'withRelated'));
        }

        // Combine: before + anchor + after
        const models = [
            ...beforeResult.data,
            ...(anchorWithRelations ? [anchorWithRelations] : []),
            ...afterModels
        ];

        // Build cursors for paginating from this window
        let nextCursor = null;
        let prevCursor = null;

        if (models.length > 0) {
            const lastModel = models[models.length - 1];
            const firstModel = models[0];

            // Always provide next/prev cursors from this window
            nextCursor = cursorUtils.encodeCursor(
                cursorUtils.extractCursorValues(lastModel, parsedOrder)
            );
            prevCursor = cursorUtils.encodeCursor(
                cursorUtils.extractCursorValues(firstModel, parsedOrder)
            );
        }

        // Count items before the anchor to report its index
        const indexCollection = this.getFilteredCollection(options);
        const likesSubquery = '(SELECT COUNT(comment_likes.id) FROM comment_likes WHERE comment_likes.comment_id = comments.id)';
        const {sql: beforeSql, bindings: beforeBindings} = cursorUtils.buildKeysetCondition(anchorValues, parsedOrder, 'before');
        const resolvedBeforeSql = beforeSql.replace(/\bcount__likes\b/g, likesSubquery);

        indexCollection.query((qb) => {
            qb.whereRaw(`(${resolvedBeforeSql})`, beforeBindings);
        });

        const indexCountQuery = indexCollection.query().clone();
        indexCountQuery.clear('select');
        indexCountQuery.clear('order');
        const indexResult = await indexCountQuery.select(
            ghostBookshelf.knex.raw('count(distinct comments.id) as aggregate')
        );
        const anchorIndex = indexResult[0] ? indexResult[0].aggregate : 0;

        return {
            data: models,
            meta: {
                pagination: {
                    limit,
                    total: beforeResult.meta.pagination.total,
                    next: nextCursor,
                    prev: prevCursor,
                    page: null,
                    pages: null
                },
                anchor: {
                    id: anchorId,
                    found: true,
                    index: anchorIndex
                }
            }
        };
    },

    countRelations() {
        return {
            replies(modelOrCollection, options) {
                const excludedCommentStatuses = options.isAdmin ? ['deleted'] : ['hidden', 'deleted'];

                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('r.id')
                        .from('comments AS r')
                        .whereRaw('r.parent_id = comments.id')
                        .whereNotIn('r.status', excludedCommentStatuses)
                        .as('count__replies');
                });
            },
            direct_replies(modelOrCollection, options) {
                const excludedCommentStatuses = options.isAdmin ? ['deleted'] : ['hidden', 'deleted'];

                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('replies.id')
                        .from('comments AS replies')
                        .where(function () {
                            // Root comments: count direct replies (parent_id = this, in_reply_to_id IS NULL)
                            this.where(function () {
                                this.whereRaw('replies.parent_id = comments.id')
                                    .whereNull('replies.in_reply_to_id');
                            })
                                // Child comments: count replies-to-this-child (in_reply_to_id = this)
                                .orWhereRaw('replies.in_reply_to_id = comments.id');
                        })
                        .whereNotIn('replies.status', excludedCommentStatuses)
                        .as('count__direct_replies');
                });
            },
            likes(modelOrCollection) {
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('comment_likes.id')
                        .from('comment_likes')
                        .whereRaw('comment_likes.comment_id = comments.id')
                        .as('count__likes');
                });
            },
            liked(modelOrCollection, options) {
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    if (options.context && options.context.member && options.context.member.id) {
                        qb.count('comment_likes.id')
                            .from('comment_likes')
                            .whereRaw('comment_likes.comment_id = comments.id')
                            .where('comment_likes.member_id', options.context.member.id)
                            .as('count__liked');
                        return;
                    }

                    // Return zero
                    qb.select(ghostBookshelf.knex.raw('0')).as('count__liked');
                });
            },
            reports(modelOrCollection) {
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('comment_reports.id')
                        .from('comment_reports')
                        .whereRaw('comment_reports.comment_id = comments.id')
                        .as('count__reports');
                });
            }
        };
    },

    /**
     * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Array} Keys allowed in the `options` hash of the model's method.
     */
    permittedOptions: function permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);
        options.push('parentId');
        options.push('isAdmin');
        options.push('browseAll');
        options.push('reportCount');
        options.push('after');
        options.push('before');
        options.push('anchor');

        return options;
    }
});

module.exports = {
    Comment: ghostBookshelf.model('Comment', Comment)
};
