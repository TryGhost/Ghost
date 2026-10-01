const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const {getCSVExportFileName} = require('./utils/csv-export-filename');
const models = require('../../models');
const formsService = require('../../services/forms');

const messages = {
    formNotFound: 'Form not found.',
    submissionNotFound: 'Form submission not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'forms',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'order',
            'page',
            'filter'
        ],
        permissions: true,
        query(frame) {
            const options = Object.assign({}, frame.options);
            delete options.include;
            return models.Form.findPage(options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        options: [],
        permissions: true,
        async query(frame) {
            const options = Object.assign({}, frame.options);
            delete options.include;
            const model = await models.Form.findOne(frame.data, options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.formNotFound)
                });
            }

            return model;
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query(frame) {
            return models.Form.add(frame.data.forms[0], frame.options);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            const model = await models.Form.edit(frame.data.forms[0], frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.formNotFound)
                });
            }

            await formsService.syncFormToAttachedPosts(frame.options.id);

            return model;
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            await formsService.cleanupFormFromPostsAndPages(frame.options.id);
            return models.Form.destroy({...frame.options, require: true});
        }
    },

    browseSubmissions: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id',
            'limit',
            'order',
            'page',
            'filter'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'browse',
            docName: 'forms'
        },
        query(frame) {
            const filter = frame.options.filter
                ? `(${frame.options.filter})+form_id:${frame.options.id}`
                : `form_id:${frame.options.id}`;

            return models.FormSubmission.findPage({
                ...frame.options,
                filter
            });
        }
    },

    destroySubmission: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id',
            'submission_id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                },
                submission_id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'destroy',
            docName: 'forms'
        },
        async query(frame) {
            const deleted = await models.FormSubmission.destroy({
                id: frame.options.submission_id,
                form_id: frame.options.id,
                require: true
            });
            return deleted;
        }
    },

    exportSubmissions: {
        headers: {
            disposition: {
                type: 'csv',
                value() {
                    return getCSVExportFileName('form-submissions');
                }
            },
            contentType: 'text/csv',
            cacheInvalidate: false
        },
        response: {
            format: 'plain'
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'browse',
            docName: 'forms'
        },
        query(frame) {
            return formsService.exportSubmissionsCSV(frame.options.id);
        }
    },

    browseAttachedPosts: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'browse',
            docName: 'forms'
        },
        async query(frame) {
            const posts = await formsService.getFormAttachedPosts(frame.options.id);
            return {
                posts: posts || []
            };
        }
    },

    attachToPost: {
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit',
            docName: 'forms'
        },
        query(frame) {
            return formsService.attachFormToPost(frame.options.id, frame.data);
        }
    },

    detachFromPost: {
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit',
            docName: 'forms'
        },
        query(frame) {
            return formsService.detachFormFromPost(frame.options.id, frame.data);
        }
    }
};

module.exports = controller;
