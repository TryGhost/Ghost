const _ = require('lodash');
const errors = require('@tryghost/errors');
const moment = require('moment');
const tpl = require('@tryghost/tpl');

const schema = require('../../../data/schema');

const messages = {
    missingContext: 'missing context',
    invalidDate: 'Date format for `{key}` is invalid.'
};

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({
        // Ghost option handling - get permitted attributes from server/data/schema.js, where the DB schema is defined
        permittedAttributes: function permittedAttributes() {
            return _.keys(schema.tables[this.tableName])
                .filter(key => key.indexOf('@@') === -1);
        }
    }, {
        /**
         * Returns an array of keys permitted in every method's `options` hash.
         * Can be overridden and added to by a model's `permittedOptions` method.
         *
         * importing: is used when import a JSON file or when migrating the database
         *
         * @return {Object} Keys allowed in the `options` hash of every model's method.
         */
        permittedOptions: function permittedOptions(methodName) {
            const baseOptions = ['context', 'withRelated'];
            const extraOptions = ['transacting', 'importing', 'forUpdate', 'migrating'];

            switch (methodName) {
            case 'toJSON':
                return baseOptions.concat('shallow', 'columns', 'previous');
            case 'destroy':
                return baseOptions.concat(extraOptions, ['id', 'destroyBy', 'require']);
            case 'add':
                return baseOptions.concat(extraOptions, ['autoRefresh']);
            case 'edit':
                return baseOptions.concat(extraOptions, ['id', 'require', 'autoRefresh']);
            case 'findOne':
                return baseOptions.concat(extraOptions, ['columns', 'require', 'mongoTransformer']);
            case 'findAll':
                return baseOptions.concat(extraOptions, ['filter', 'columns', 'mongoTransformer']);
            case 'findPage':
                return baseOptions.concat(extraOptions, ['filter', 'order', 'autoOrder', 'page', 'limit', 'columns', 'mongoTransformer']);
            default:
                return baseOptions.concat(extraOptions);
            }
        },

        /**
         * Filters potentially unsafe model attributes, so you can pass them to Bookshelf / Knex.
         * This filter should be called before each insert/update operation.
         *
         * @param {Object} data Has keys representing the model's attributes/fields in the database.
         * @return {Object} The filtered results of the passed in data, containing only what's allowed in the schema.
         */
        filterData: function filterData(data) {
            const permittedAttributes = this.prototype.permittedAttributes();
            const filteredData = _.pick(data, permittedAttributes);
            const sanitizedData = this.sanitizeData(filteredData);

            return sanitizedData;
        },

        /**
         * `sanitizeData` ensures that client data is in the correct format for further operations.
         *
         * Dates:
         * - client dates are sent as ISO 8601 format (moment(..).format())
         * - server dates are in JS Date format
         *   >> when bookshelf fetches data from the database, all dates are in JS Dates
         *   >> see `parse`
         * - Bookshelf updates the model with the new client data via the `set` function
         * - Bookshelf uses a simple `isEqual` function from lodash to detect real changes
         * - .previous(attr) and .get(attr) returns false obviously
         * - internally we use our `hasDateChanged` if we have to compare previous dates
         * - but Bookshelf is not in our control for this case
         *
         * @IMPORTANT
         * Before the new client data get's inserted again, the dates get's re-transformed into
         * proper strings, see `format`.
         *
         * @IMPORTANT
         * Sanitize relations.
         */
        sanitizeData: function sanitizeData(data) {
            const tableName = _.result(this.prototype, 'tableName');
            let date;

            _.each(data, (value, property) => {
                if (value !== null
                && Object.prototype.hasOwnProperty.call(schema.tables[tableName], property)
                && schema.tables[tableName][property].type === 'dateTime'
                && typeof value === 'string'
                ) {
                    date = new Date(value);

                    // CASE: client sends `0000-00-00 00:00:00`
                    if (isNaN(date)) {
                        throw new errors.ValidationError({
                            message: tpl(messages.invalidDate, {key: property}),
                            code: 'DATE_INVALID'
                        });
                    }

                    data[property] = moment(value).toDate();
                }

                if (this.prototype.relationships && this.prototype.relationships.indexOf(property) !== -1) {
                    let relations = data[property];

                    // CASE: 1:1 relation will have single data point
                    if (!_.isArray(data[property])) {
                        relations = [data[property]];
                    }
                    _.each(relations, (relation, indexInArr) => {
                        _.each(relation, (relationValue, relationProperty) => {
                            if (relationValue !== null
                            && Object.prototype.hasOwnProperty.call(schema.tables[this.prototype.relationshipBelongsTo[property]], relationProperty)
                            && schema.tables[this.prototype.relationshipBelongsTo[property]][relationProperty].type === 'dateTime'
                            && typeof relationValue === 'string'
                            ) {
                                date = new Date(relationValue);

                                // CASE: client sends `0000-00-00 00:00:00`
                                if (isNaN(date)) {
                                    throw new errors.ValidationError({
                                        message: tpl(messages.invalidDate, {key: relationProperty}),
                                        code: 'DATE_INVALID'
                                    });
                                }

                                data[property][indexInArr][relationProperty] = moment(relationValue).toDate();
                            }
                        });
                    });
                }
            });

            return data;
        },

        /**
         * Filters potentially unsafe `options` in a model method's arguments, so you can pass them to Bookshelf / Knex.
         * @param {Object} unfilteredOptions Represents options to filter in order to be passed to the Bookshelf query.
         * @param {String} methodName The name of the method to check valid options for.
         * @return {Object} The filtered results of `options`.
         */
        filterOptions: function filterOptions(unfilteredOptions, methodName, filterConfig) {
            unfilteredOptions = unfilteredOptions || {};
            filterConfig = filterConfig || {};

            if (Object.prototype.hasOwnProperty.call(unfilteredOptions, 'include')) {
                throw new errors.IncorrectUsageError({
                    message: 'The model layer expects using `withRelated`.'
                });
            }

            let options = _.cloneDeep(unfilteredOptions);
            const extraAllowedProperties = filterConfig.extraAllowedProperties || [];
            const permittedOptions = [...new Set([...this.permittedOptions(methodName, options), ...extraAllowedProperties])];
            options = Object.fromEntries(
                Object.entries(options).filter(([key]) => permittedOptions.includes(key))
            );

            if (this.defaultRelations) {
                options = this.defaultRelations(methodName, options);
            }

            return options;
        }
    });
};
