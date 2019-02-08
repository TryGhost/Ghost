const Promise = require('bluebird');
const backupDatabase = require('../../data/db/backup');
const exporter = require('../../data/exporter');
const importer = require('../../data/importer');
const AbstractPoller = require('../../lib/abstract-poller');
const common = require('../../lib/common');
const models = require('../../models');

const transformImportSuccess = (result) => {
    return {
        // NOTE: response can contain 2 objects if images are imported
        problems: result[result.length === 2 ? 1 : 0].problems
    };
};

const transformImportFailure = error => ({errors: [error]});
const asyncImporter = new AbstractPoller(importer.importFromFile, transformImportSuccess, transformImportFailure);

module.exports = {
    docName: 'db',

    backupContent: {
        permissions: true,
        options: [
            'include',
            'filename'
        ],
        validation: {
            options: {
                include: {
                    values: exporter.EXCLUDED_TABLES
                }
            }
        },
        query(frame) {
            // NOTE: we need to have `include` property available as backupDatabase uses it internally
            Object.assign(frame.options, {include: frame.options.withRelated});

            return backupDatabase(frame.options);
        }
    },

    exportContent: {
        options: [
            'include'
        ],
        validation: {
            options: {
                include: {
                    values: exporter.EXCLUDED_TABLES
                }
            }
        },
        headers: {
            disposition: {
                type: 'file',
                value: () => (exporter.fileName())
            }
        },
        permissions: {
            method: 'exportContent'
        },
        query(frame) {
            return Promise.resolve()
                .then(() => exporter.doExport({include: frame.options.withRelated}))
                .catch((err) => {
                    return Promise.reject(new common.errors.GhostError({err: err}));
                });
        }
    },

    importContent: {
        options: [
            'include'
        ],
        validation: {
            options: {
                include: {
                    values: exporter.EXCLUDED_TABLES
                }
            }
        },
        permissions: {
            method: 'importContent'
        },
        query(frame) {
            return importer.importFromFile(frame.file, {include: frame.options.withRelated});
        }
    },

    importContentAsync: {
        statusCode: 202,
        options: [
            'include'
        ],
        validation: {
            options: {
                include: {
                    values: exporter.EXCLUDED_TABLES
                }
            }
        },
        permissions: {
            method: 'importContent'
        },
        query(frame) {
            return asyncImporter.run(frame.file, {include: frame.options.withRelated});
        }
    },

    asyncImportStatus: {
        permissions: {
            method: 'importContent'
        },
        query() {
            // `.state` is a getter which always returns a new object
            return asyncImporter.state;
        }
    },

    deleteAllContent: {
        statusCode: 204,
        permissions: {
            method: 'deleteAllContent'
        },
        query() {
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
                    const queryOpts = {
                        columns: 'id',
                        context: {internal: true},
                        destroyAll: true,
                        transacting: transacting
                    };

                    return models.Post.findAll(queryOpts)
                        .then((response) => {
                            return Promise.map(response.models, (post) => {
                                return models.Post.destroy(Object.assign({id: post.id}, queryOpts));
                            }, {concurrency: 100});
                        })
                        .then(() => models.Tag.findAll(queryOpts))
                        .then((response) => {
                            return Promise.map(response.models, (tag) => {
                                return models.Tag.destroy(Object.assign({id: tag.id}, queryOpts));
                            }, {concurrency: 100});
                        })
                        .catch((err) => {
                            throw new common.errors.GhostError({
                                err: err
                            });
                        });
                });
            }

            return backupDatabase().then(deleteContent);
        }
    }
};
