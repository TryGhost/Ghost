const models = require('../../models');
const common = require('../../lib/common');
const urlUtils = require('../../lib/url-utils');
const {mega} = require('../../services/mega');
const allowedIncludes = ['tags', 'authors', 'authors.roles', 'email'];
const unsafeAttrs = ['status', 'authors', 'visibility'];

module.exports = {
    docName: 'posts',
    browse: {
        options: [
            'include',
            'filter',
            'fields',
            'formats',
            'limit',
            'order',
            'page',
            'debug',
            'absolute_urls'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                },
                formats: {
                    values: models.Post.allowedFormats
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return models.Post.findPage(frame.options);
        }
    },

    read: {
        options: [
            'include',
            'fields',
            'formats',
            'debug',
            'absolute_urls',
            // NOTE: only for internal context
            'forUpdate',
            'transacting'
        ],
        data: [
            'id',
            'slug',
            'uuid'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                },
                formats: {
                    values: models.Post.allowedFormats
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return models.Post.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.posts.postNotFound')
                        });
                    }

                    return model;
                });
        }
    },

    add: {
        statusCode: 201,
        headers: {},
        options: [
            'include',
            'source',
            'send_email_when_published'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                },
                source: {
                    values: ['html']
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return models.Post.add(frame.data.posts[0], frame.options)
                .then((model) => {
                    if (model.get('status') !== 'published') {
                        this.headers.cacheInvalidate = false;
                    } else {
                        this.headers.cacheInvalidate = true;
                    }

                    return model;
                });
        }
    },

    edit: {
        headers: {},
        options: [
            'include',
            'id',
            'source',
            'send_email_when_published',
            // NOTE: only for internal context
            'forUpdate',
            'transacting'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                },
                id: {
                    required: true
                },
                source: {
                    values: ['html']
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return models.Post.edit(frame.data.posts[0], frame.options)
                .then(async (model) => {
                    if (!model.get('send_email_when_published')) {
                        return model;
                    }

                    const postPublished = model.wasChanged() && (model.get('status') === 'published') && (model.previous('status') !== 'published');

                    if (postPublished) {
                        let postEmail = model.relations.email;

                        if (!postEmail) {
                            const email = await mega.addEmail(model, frame.options);
                            model.set('email', email);
                        } else if (postEmail && postEmail.get('status') === 'failed') {
                            const email = await mega.retryFailedEmail(postEmail);
                            model.set('email', email);
                        }
                    }

                    return model;
                })
                .then((model) => {
                    if (
                        model.get('status') === 'published' && model.wasChanged() ||
                        model.get('status') === 'draft' && model.previous('status') === 'published'
                    ) {
                        this.headers.cacheInvalidate = true;
                    } else if (
                        model.get('status') === 'draft' && model.previous('status') !== 'published' ||
                        model.get('status') === 'scheduled' && model.wasChanged()
                    ) {
                        this.headers.cacheInvalidate = {
                            value: urlUtils.urlFor({
                                relativeUrl: urlUtils.urlJoin('/p', model.get('uuid'), '/')
                            })
                        };
                    } else {
                        this.headers.cacheInvalidate = false;
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
            'include',
            'id'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                },
                id: {
                    required: true
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            frame.options.require = true;

            return models.Post.destroy(frame.options)
                .return(null)
                .catch(models.Post.NotFoundError, () => {
                    throw new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.posts.postNotFound')
                    });
                });
        }
    }
};
