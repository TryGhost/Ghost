const models = require('../../models');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
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
                        throw new errors.NotFoundError({
                            message: i18n.t('errors.api.posts.postNotFound')
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
            'formats',
            'source'
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
            'formats',
            'source',
            'email_recipient_filter',
            'send_email_when_published',
            'force_rerender',
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
                },
                email_recipient_filter: {
                    values: ['none', 'free', 'paid', 'all']
                },
                send_email_when_published: {
                    values: [true, false]
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        async query(frame) {
            let model;
            if (!frame.options.email_recipient_filter && frame.options.send_email_when_published) {
                await models.Base.transaction(async (transacting) => {
                    const options = {
                        ...frame.options,
                        transacting
                    };

                    /**
                     * 1. We need to edit the post first in order to know what the visibility is.
                     * 2. We can only pass the email_recipient_filter when we change the status.
                     *
                     * So, we first edit the post as requested, with all information except the status,
                     * from there we can determine what the email_recipient_filter should be and then finish
                     * the edit, with the status and the email_recipient_filter option.
                     */
                    const status = frame.data.posts[0].status;
                    delete frame.data.posts[0].status;
                    const interimModel = await models.Post.edit(frame.data.posts[0], options);
                    frame.data.posts[0].status = status;

                    options.email_recipient_filter = interimModel.get('visibility') === 'paid' ? 'paid' : 'all';

                    model = await models.Post.edit(frame.data.posts[0], options);
                });
            } else {
                model = await models.Post.edit(frame.data.posts[0], frame.options);
            }

            /**Handle newsletter email */
            if (model.get('email_recipient_filter') !== 'none') {
                const postPublished = model.wasChanged() && (model.get('status') === 'published') && (model.previous('status') !== 'published');
                if (postPublished) {
                    let postEmail = model.relations.email;

                    if (!postEmail) {
                        const email = await mega.addEmail(model, Object.assign({}, frame.options, {apiVersion: 'v3'}));
                        model.set('email', email);
                    } else if (postEmail && postEmail.get('status') === 'failed') {
                        const email = await mega.retryFailedEmail(postEmail);
                        model.set('email', email);
                    }
                }
            }

            /**Handle cache invalidation */
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
                .then(() => null)
                .catch(models.Post.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: i18n.t('errors.api.posts.postNotFound')
                    }));
                });
        }
    }
};
