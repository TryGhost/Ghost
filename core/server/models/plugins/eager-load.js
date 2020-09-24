const _ = require('lodash');
const _debug = require('ghost-ignition').debug._base;
const debug = _debug('ghost-query');

/**
 * Enchances knex query builder with a join to relation configured in
 *
 * @param {Bookshelf.Model} model instance of Bookshelf model
 * @param {String[]} relationsToLoad relations to be included in joins
 */
function withEager(model, relationsToLoad) {
    const tableName = _.result(model.constructor.prototype, 'tableName');

    return function (qb) {
        if (!model.relationsMeta) {
            return qb;
        }

        for (const [key, config] of Object.entries(model.relationsMeta)) {
            if (relationsToLoad.includes(key)) {
                const innerQb = qb
                    .leftJoin(config.targetTableName, `${tableName}.id`, `${config.targetTableName}.${config.foreignKey}`);

                debug(`QUERY has posts: ${innerQb.toSQL().sql}`);
            }
        }

        return qb;
    };
}

function load(options) {
    if (!options) {
        return;
    }

    if (this.eagerLoad) {
        if (!options.columns && options.withRelated && _.intersection(this.eagerLoad, options.withRelated).length) {
            this.query(withEager(this, this.eagerLoad));
        }
    }
}

/**
 * ## Pagination
 * Extends `bookshelf.Model` native `fetch` and `fetchAll` methods with
 * a join to "eager loaded" relation. An exaple of such loading is when
 * there is a need to order by fields in the related table.
 *
 */
module.exports = function eagerLoadPlugin(Bookshelf) {
    const modelPrototype = Bookshelf.Model.prototype;

    Bookshelf.Model = Bookshelf.Model.extend({
        initialize: function () {
            return modelPrototype.initialize.apply(this, arguments);
        },

        fetch: function () {
            load.apply(this, arguments);

            if (_debug.enabled('ghost-query')) {
                debug('QUERY', this.query().toQuery());
            }

            return modelPrototype.fetch.apply(this, arguments);
        },

        fetchAll: function () {
            load.apply(this, arguments);

            if (_debug.enabled('ghost-query')) {
                debug('QUERY', this.query().toQuery());
            }

            return modelPrototype.fetchAll.apply(this, arguments);
        }
    });
};
