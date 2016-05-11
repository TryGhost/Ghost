var _      = require('lodash'),
    errors = require('../../errors'),
    gql    = require('ghost-gql'),
    i18n   = require('../../i18n'),
    filter,
    filterUtils;

filterUtils = {
    /**
     * ## Combine Filters
     * Util to combine the enforced, default and custom filters such that they behave accordingly
     * @param {String|Object} enforced - filters which must ALWAYS be applied
     * @param {String|Object} defaults - filters which must be applied if a matching filter isn't provided
     * @param {...String|Object} [custom] - custom filters which are additional
     * @returns {*}
     */
    combineFilters: function combineFilters(enforced, defaults, custom /* ...custom */) {
        custom = Array.prototype.slice.call(arguments, 2);

        // Ensure everything has been run through the gql parser
        try {
            enforced = enforced ? (_.isString(enforced) ? gql.parse(enforced) : enforced) : null;
            defaults = defaults ? (_.isString(defaults) ? gql.parse(defaults) : defaults) : null;
            custom = _.map(custom, function (arg) {
                return _.isString(arg) ? gql.parse(arg) : arg;
            });
        } catch (error) {
            errors.logAndThrowError(
                new errors.ValidationError(error.message, 'filter'),
                i18n.t('errors.models.plugins.filter.errorParsing'),
                i18n.t('errors.models.plugins.filter.forInformationRead', {url: 'http://api.ghost.org/docs/filter'})
            );
        }

        // Merge custom filter options into a single set of statements
        custom = gql.json.mergeStatements.apply(this, custom);

        // if there is no enforced or default statements, return just the custom statements;
        if (!enforced && !defaults) {
            return custom;
        }

        // Reduce custom filters based on enforced filters
        if (custom && !_.isEmpty(custom.statements) && enforced && !_.isEmpty(enforced.statements)) {
            custom.statements = gql.json.rejectStatements(custom.statements, function (customStatement) {
                return gql.json.findStatement(enforced.statements, customStatement, 'prop');
            });
        }

        // Reduce default filters based on custom filters
        if (defaults && !_.isEmpty(defaults.statements) && custom && !_.isEmpty(custom.statements)) {
            defaults.statements = gql.json.rejectStatements(defaults.statements, function (defaultStatement) {
                return gql.json.findStatement(custom.statements, defaultStatement, 'prop');
            });
        }

        // Merge enforced and defaults
        enforced = gql.json.mergeStatements(enforced, defaults);

        if (_.isEmpty(custom.statements)) {
            return enforced;
        }

        if (_.isEmpty(enforced.statements)) {
            return custom;
        }

        return {
            statements: [
                {group: enforced.statements},
                {group: custom.statements, func: 'and'}
            ]
        };
    }
};

filter = function filter(Bookshelf) {
    var Model = Bookshelf.Model.extend({
        // Cached copy of the filters setup for this model instance
        _filters: null,
        // Override these on the various models
        enforcedFilters: function enforcedFilters() {},
        defaultFilters: function defaultFilters() {},

        /**
         * ## Post process Filters
         * Post Process filters looking for joins etc
         * @TODO refactor this
         * @param {object} options
         */
        postProcessFilters: function postProcessFilters(options) {
            var joinTables = this._filters.joins;

            if (joinTables && joinTables.indexOf('tags') > -1) {
                // We need to use leftOuterJoin to insure we still include posts which don't have tags in the result
                // The where clause should restrict which items are returned
                this
                    .query('leftOuterJoin', 'posts_tags', 'posts_tags.post_id', '=', 'posts.id')
                    .query('leftOuterJoin', 'tags', 'posts_tags.tag_id', '=', 'tags.id');

                // The order override should ONLY happen if we are doing an "IN" query
                // TODO move the order handling to the query building that is currently inside pagination
                // TODO make the order handling in pagination handle orderByRaw
                // TODO extend this handling to all joins
                if (gql.json.findStatement(this._filters.statements, {prop: /^tags/, op: 'IN'})) {
                    // TODO make this count the number of MATCHING tags, not just the number of tags
                    this.query('orderByRaw', 'count(tags.id) DESC');
                }

                // We need to add a group by to counter the double left outer join
                // TODO improve on the group by handling
                options.groups = options.groups || [];
                options.groups.push('posts.id');
            }

            if (joinTables && joinTables.indexOf('author') > -1) {
                this
                    .query('join', 'users as author', 'author.id', '=', 'posts.author_id');
            }
        },

        /**
         * ## fetchAndCombineFilters
         * Helper method, uses the combineFilters util to apply filters to the current model instance
         * based on options and the set enforced/default filters for this resource
         * @param {Object} options
         * @returns {Bookshelf.Model}
         */
        fetchAndCombineFilters: function fetchAndCombineFilters(options) {
            options = options || {};

            this._filters = filterUtils.combineFilters(
                this.enforcedFilters(),
                this.defaultFilters(),
                options.filter,
                options.where
            );

            return this;
        },

        /**
         * ## Apply Filters
         * Method which makes the necessary query builder calls (through knex) for the filters set
         * on this model instance
         * @param {Object} options
         * @returns {Bookshelf.Model}
         */
        applyDefaultAndCustomFilters: function applyDefaultAndCustomFilters(options) {
            var self = this;

            // @TODO figure out a better place/way to trigger loading filters
            if (!this._filters) {
                this.fetchAndCombineFilters(options);
            }

            if (this._filters) {
                if (this.debug) {
                    gql.json.printStatements(this._filters.statements);
                }

                this.query(function (qb) {
                    gql.knexify(qb, self._filters);
                });

                // Replaces processGQLResult
                this.postProcessFilters(options);
            }

            return this;
        }
    });

    Bookshelf.Model = Model;
};

/**
 * ## Export Filter plugin
 * @api public
 */
module.exports = filter;
