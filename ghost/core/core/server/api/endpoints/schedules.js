const models = require('../../models');
const postSchedulingService = require('../../services/posts/post-scheduling-service')();

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'schedules',
    publish: {
        headers: {
            cacheInvalidate: false
        },
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
        async query(frame) {
            const resourceType = frame.options.resource;
            const options = {
                status: 'scheduled',
                id: frame.options.id,
                context: {
                    internal: true
                }
            };

            const {scheduledResource, preScheduledResource} = await postSchedulingService.publish(resourceType, frame.options.id, frame.data.force, options);
            const cacheInvalidation = postSchedulingService.handleCacheInvalidation(scheduledResource, preScheduledResource);

            if (cacheInvalidation === true) {
                frame.setHeader('X-Cache-Invalidate', '/*');
            } else if (cacheInvalidation.value) {
                frame.setHeader('X-Cache-Invalidate', cacheInvalidation.value);
            }

            const response = {};
            response[resourceType] = [scheduledResource];
            return response;
        }
    },

    getScheduled: {
        // NOTE: this method is for internal use only by DefaultScheduler
        //       it is not exposed anywhere!
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        validation: {
            options: {
                resource: {
                    required: true,
                    values: ['posts', 'pages']
                }
            }
        },
        async query(frame) {
            const resourceModel = 'Post';
            const resourceType = (frame.options.resource === 'post') ? 'post' : 'page';
            const cleanOptions = {};
            cleanOptions.filter = `status:scheduled+type:${resourceType}`;
            cleanOptions.columns = ['id', 'published_at', 'created_at', 'type'];

            const result = await models[resourceModel].findAll(cleanOptions);
            let response = {};
            response[resourceType] = result;
            return response;
        }
    }
};

module.exports = controller;
