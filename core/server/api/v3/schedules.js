const _ = require('lodash');
const moment = require('moment');
const config = require('../../../shared/config');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');
const api = require('./index');

module.exports = {
    docName: 'schedules',
    publish: {
        headers: {},
        options: [
            'id',
            'resource'
        ],
        data: [
            'force'
        ],
        validation: {
            options: {
                id: {
                    required: true
                },
                resource: {
                    required: true,
                    values: ['posts', 'pages']
                }
            }
        },
        permissions: {
            docName: 'posts'
        },
        query(frame) {
            let resource;
            const resourceType = frame.options.resource;
            const publishAPostBySchedulerToleranceInMinutes = config.get('times').publishAPostBySchedulerToleranceInMinutes;

            const options = {
                status: 'scheduled',
                id: frame.options.id,
                context: {
                    internal: true
                }
            };

            return api[resourceType].read({id: frame.options.id}, options)
                .then((result) => {
                    resource = result[resourceType][0];
                    const publishedAtMoment = moment(resource.published_at);

                    if (publishedAtMoment.diff(moment(), 'minutes') > publishAPostBySchedulerToleranceInMinutes) {
                        return Promise.reject(new errors.NotFoundError({message: i18n.t('errors.api.job.notFound')}));
                    }

                    if (publishedAtMoment.diff(moment(), 'minutes') < publishAPostBySchedulerToleranceInMinutes * -1 && frame.data.force !== true) {
                        return Promise.reject(new errors.NotFoundError({message: i18n.t('errors.api.job.publishInThePast')}));
                    }

                    const editedResource = {};
                    editedResource[resourceType] = [{
                        status: 'published',
                        updated_at: moment(resource.updated_at).toISOString(true)
                    }];

                    return api[resourceType].edit(
                        editedResource,
                        _.pick(options, ['context', 'id', 'transacting', 'forUpdate'])
                    );
                })
                .then((result) => {
                    const scheduledResource = result[resourceType][0];

                    if (
                        (scheduledResource.status === 'published' && resource.status !== 'published') ||
                        (scheduledResource.status === 'draft' && resource.status === 'published')
                    ) {
                        this.headers.cacheInvalidate = true;
                    } else if (
                        (scheduledResource.status === 'draft' && resource.status !== 'published') ||
                        (scheduledResource.status === 'scheduled' && resource.status !== 'scheduled')
                    ) {
                        this.headers.cacheInvalidate = {
                            value: urlUtils.urlFor({
                                relativeUrl: urlUtils.urlJoin('/p', scheduledResource.uuid, '/')
                            })
                        };
                    } else {
                        this.headers.cacheInvalidate = false;
                    }

                    return result;
                });
        }
    },

    getScheduled: {
        // NOTE: this method is for internal use only by DefaultScheduler
        //       it is not exposed anywhere!
        permissions: false,
        validation: {
            options: {
                resource: {
                    required: true,
                    values: ['posts', 'pages']
                }
            }
        },
        query(frame) {
            const resourceModel = 'Post';
            const resourceType = (frame.options.resource === 'post') ? 'post' : 'page';
            const cleanOptions = {};
            cleanOptions.filter = `status:scheduled+type:${resourceType}`;
            cleanOptions.columns = ['id', 'published_at', 'created_at', 'type'];

            return models[resourceModel].findAll(cleanOptions)
                .then((result) => {
                    let response = {};
                    response[resourceType] = result;
                    return response;
                });
        }
    }
};
