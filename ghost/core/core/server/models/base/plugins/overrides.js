const {PIVOT_PREFIX} = require('bookshelf/lib/constants');
const _ = require('lodash');

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    const ParentModel = Bookshelf.Model;

    Bookshelf.Model = Bookshelf.Model.extend({
        /**
         * Strip `lock` from options before eager loading relations.
         *
         * Bookshelf propagates `lock` (e.g. 'forUpdate') to all eager-loaded
         * relation queries via _handleEager. This causes FOR UPDATE locks on
         * tags, authors, and other relation tables during post edits — creating
         * a large lock surface that leads to database deadlocks under concurrent
         * writes. The FOR UPDATE lock is only needed on the primary row fetch,
         * not on relation loading.
         */
        _handleEager: function _handleEager(response, options) {
            return ParentModel.prototype._handleEager.call(this, response, _.omit(options, 'lock'));
        },

        /**
         * Bookshelf's .format() is run when fetching as well as saving.
         * We need a way to transform attributes only on save so we override
         * .sync() which is run on every database operation where we can
         * run any transforms needed only on insert and update operations
         */
        sync: function sync() {
            const parentSync = ParentModel.prototype.sync.apply(this, arguments);
            const originalUpdateSync = parentSync.update;
            const originalInsertSync = parentSync.insert;
            const self = this;

            parentSync.update = function update(attrs) {
                self._isWriting = true;

                const originalPromise = originalUpdateSync.apply(this, [attrs]);

                return originalPromise.finally(function () {
                    self._isWriting = false;
                });
            };

            parentSync.insert = function insert() {
                self._isWriting = true;

                const originalPromise = originalInsertSync.apply(this);

                return originalPromise.finally(function () {
                    self._isWriting = false;
                });
            };

            return parentSync;
        },

        // overridable function for models to format attrs only when saving to db
        // this function doesn't override anything in Bookshelf but we use this in
        // this plugin and sub-models may override it, so it's easier to keep it in here
        formatOnWrite: function formatOnWrite(attrs) {
            return attrs;
        },

        // format date before writing to DB, bools work
        format: function format(attrs) {
            if (this._isWriting) {
                attrs = this.formatOnWrite(attrs);
            }

            return this.fixDatesWhenSave(attrs);
        },

        // format data and bool when fetching from DB
        parse: function parse(attrs) {
            return this.fixBools(this.fixDatesWhenFetch(attrs));
        },

        /**
         * `shallow`    - won't return relations
         * `omitPivot`  - won't return pivot fields
         *
         * `toJSON` calls `serialize`.
         *
         * @param unfilteredOptions
         * @returns {*}
         */
        toJSON: function toJSON(unfilteredOptions) {
            const options = Bookshelf.Model.filterOptions(unfilteredOptions, 'toJSON');
            options.omitPivot = true;

            /**
             * removes null relations coming from `hasOne` - https://bookshelfjs.org/api.html#Model-instance-hasOne
             * Based on https://github.com/bookshelf/bookshelf/issues/72#issuecomment-25164617
             */
            for (const key in this.relations) {
                if (_.isEmpty(this.relations[key])) {
                    delete this.relations[key];
                }
            }
            // CASE: get JSON of previous attrs
            if (options.previous) {
                const clonedModel = _.cloneDeep(this);
                // Manually remove pivot fields from cloned model as they are not
                // removed from _previousAttributes via `omitPivot` option
                clonedModel.attributes = _.omitBy(
                    this._previousAttributes,
                    (value, key) => key.startsWith(PIVOT_PREFIX)
                );

                if (this.relationships) {
                    this.relationships.forEach((relation) => {
                        if (this._previousRelations && Object.prototype.hasOwnProperty.call(this._previousRelations, relation)) {
                            clonedModel.related(relation).models = this._previousRelations[relation].models;
                        }
                    });
                }

                return ParentModel.prototype.toJSON.call(clonedModel, options);
            }

            return ParentModel.prototype.toJSON.call(this, options);
        }
    });
};
