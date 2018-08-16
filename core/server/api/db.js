// # DB API
// API for DB operations
const Promise = require('bluebird'),
    _ = require('lodash'),
    pipeline = require('../lib/promise/pipeline'),
    localUtils = require('./utils'),
    exporter = require('../data/exporter'),
    importer = require('../data/importer'),
    backupDatabase = require('../data/db/backup'),
    models = require('../models'),
    common = require('../lib/common'),
    docName = 'db';

let db;

/**
 * ## DB API Methods
 *
 * **See:** [API Methods](constants.js.html#api%20methods)
 */
db = {
    /**
     * ### Archive Content
     * Generate the JSON to export
     *
     * @public
     * @returns {Promise} Ghost Export JSON format
     */
    backupContent: function (options) {
        let tasks;

        options = options || {};

        function jsonResponse(filename) {
            return {db: [{filename: filename}]};
        }

        tasks = [
            localUtils.convertOptions(exporter.EXCLUDED_TABLES, null, {forModel: false}),
            backupDatabase,
            jsonResponse
        ];

        return pipeline(tasks, options);
    },
    /**
     * ### Export Content
     * Generate the JSON to export
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Ghost Export JSON format
     */
    exportContent: function exportContent(options) {
        let tasks;

        options = options || {};

        // Export data, otherwise send error 500
        function exportContent(options) {
            return exporter.doExport({include: options.include}).then((exportedData) => {
                return {
                    db: [exportedData]
                };
            }).catch((err) => {
                return Promise.reject(new common.errors.GhostError({err: err}));
            });
        }

        tasks = [
            localUtils.handlePermissions(docName, 'exportContent'),
            localUtils.convertOptions(exporter.EXCLUDED_TABLES, null, {forModel: false}),
            exportContent
        ];

        return pipeline(tasks, options);
    },
    /**
     * ### Import Content
     * Import posts, tags etc from a JSON blob
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    importContent: function importContent(options) {
        let tasks;
        options = options || {};

        function importContent(options) {
            return importer.importFromFile(_.omit(options, 'include'), {include: options.include})
                // NOTE: response can contain 2 objects if images are imported
                .then((response) => {
                    return {
                        db: [],
                        problems: response.length === 2 ? response[1].problems : response[0].problems
                    };
                });
        }

        tasks = [
            localUtils.handlePermissions(docName, 'importContent'),
            localUtils.convertOptions(exporter.EXCLUDED_TABLES, null, {forModel: false}),
            importContent
        ];

        return pipeline(tasks, options);
    },
    /**
     * ### Delete All Content
     * Remove all posts and tags
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    deleteAllContent: function deleteAllContent(options) {
        let tasks;
        const queryOpts = {columns: 'id', context: {internal: true}, destroyAll: true};

        options = options || {};

        /**
         * @NOTE:
         * We fetch all posts with `columns:id` to increase the speed of this endpoint.
         * And if you trigger `post.destroy(..)`, this will trigger bookshelf and model events.
         * But we only have to `id` available in the model. This won't work, because:
         *   - model layer can't trigger event e.g. `post.page` to trigger `post|page.unpublished`.
         *   - `onDestroyed` or `onDestroying` can contain custom logic
         */
        function deleteContent() {
            return models.Base.transaction((transacting) => {
                queryOpts.transacting = transacting;

                return models.Post.findAll(queryOpts)
                    .then((response) => {
                        return Promise.map(response.models, (post) => {
                            return models.Post.destroy(Object.assign({id: post.id}, queryOpts));
                        }, {concurrency: 100});
                    })
                    .then(() => {
                        return models.Tag.findAll(queryOpts);
                    })
                    .then((response) => {
                        return Promise.map(response.models, (tag) => {
                            return models.Tag.destroy(Object.assign({id: tag.id}, queryOpts));
                        }, {concurrency: 100});
                    })
                    .return({db: []})
                    .catch((err) => {
                        throw new common.errors.GhostError({
                            err: err
                        });
                    });
            });
        }

        tasks = [
            localUtils.handlePermissions(docName, 'deleteAllContent'),
            backupDatabase,
            deleteContent
        ];

        return pipeline(tasks, options);
    }
};

module.exports = db;
