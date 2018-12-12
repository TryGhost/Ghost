const Promise = require('bluebird');
const models = require('../../models');
const fsLib = require('../../lib/fs');
const common = require('../../lib/common');

const subscribers = {
    docName: 'subscribers',
    browse: {
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'page'
        ],
        permissions: true,
        validation: {},
        query(frame) {
            return models.Subscriber.findPage(frame.options);
        }
    },

    read: {
        headers: {},
        data: [
            'id',
            'email'
        ],
        validation: {},
        permissions: true,
        query(frame) {
            return models.Subscriber.findOne(frame.data);
        }
    },

    add: {
        statusCode: 201,
        headers: {},
        validation: {
            data: {
                email: {required: true}
            }
        },
        permissions: true,
        query(frame) {
            return models.Subscriber.getByEmail(frame.data.subscribers[0].email)
                .then((subscriber) => {
                    if (subscriber && frame.options.context.external) {
                        // we don't expose this information
                        return Promise.resolve(subscriber);
                    } else if (subscriber) {
                        return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.subscribers.subscriberAlreadyExists')}));
                    }

                    return models.Subscriber
                        .add(frame.data.subscribers[0])
                        .catch((error) => {
                            if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                                return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.subscribers.subscriberAlreadyExists')}));
                            }

                            return Promise.reject(error);
                        });
                });
        }
    },

    edit: {
        headers: {},
        options: [
            'id'
        ],
        validation: {
            id: {
                required: true
            }
        },
        permissions: true,
        query(frame) {
            return models.Subscriber.edit(frame.data.subscribers[0], frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.subscribers.subscriberNotFound')
                        }));
                    }

                    return model;
                });
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id',
            'email'
        ],
        validation: {},
        permissions: true,
        query(frame) {
            /**
             * ### Delete Subscriber
             * If we have an email param, check the subscriber exists
             * @type {[type]}
             */
            function getSubscriberByEmail(options) {
                if (options.email) {
                    return models.Subscriber.getByEmail(options.email, options)
                        .then((subscriber) => {
                            if (!subscriber) {
                                return Promise.reject(new common.errors.NotFoundError({
                                    message: common.i18n.t('errors.api.subscribers.subscriberNotFound')
                                }));
                            }

                            options.id = subscriber.get('id');

                            return options;
                        });
                }

                return Promise.resolve(options);
            }

            return getSubscriberByEmail(frame.options)
                .then((options) => {
                    return models.Subscriber
                        .destroy(options)
                        .return(null);
                });
        }
    },

    exportCSV: {
        headers: {
            disposition: {
                type: 'csv',
                value() {
                    const datetime = (new Date()).toJSON().substring(0, 10);
                    return `subscribers.${datetime}.csv`;
                }
            }
        },
        response: {
            format: 'plain'
        },
        permissions: {
            method: 'browse'
        },
        validation: {},
        query(frame) {
            return models.Subscriber.findAll(frame.options)
                .catch((err) => {
                    return Promise.reject(new common.errors.GhostError({err: err}));
                });
        }
    },

    importCSV: {
        statusCode: 201,
        permissions: {
            method: 'add'
        },
        validation: {},
        query(frame) {
            let filePath = frame.file.path,
                fulfilled = 0,
                invalid = 0,
                duplicates = 0;

            return fsLib.readCSV({
                path: filePath,
                columnsToExtract: [{name: 'email', lookup: /email/i}]
            }).then((result) => {
                return Promise.all(result.map((entry) => {
                    const apiv2 = require('./index');

                    return apiv2.subscribers.add.query({
                        data: {subscribers: [{email: entry.email}]},
                        options: {
                            context: frame.options.context
                        }
                    }).reflect();
                })).each((inspection) => {
                    if (inspection.isFulfilled()) {
                        fulfilled = fulfilled + 1;
                    } else {
                        if (inspection.reason() instanceof common.errors.ValidationError) {
                            duplicates = duplicates + 1;
                        } else {
                            invalid = invalid + 1;
                        }
                    }
                });
            }).then(() => {
                return {
                    meta: {
                        stats: {
                            imported: fulfilled,
                            duplicates: duplicates,
                            invalid: invalid
                        }
                    }
                };
            });
        }
    }
};

module.exports = subscribers;
