const models = require('../../models');

const postSchedulingService = require('../../services/posts/post-scheduling-service')();

module.exports = {
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
            const cacheInvalidate = postSchedulingService.handleCacheInvalidation(scheduledResource, preScheduledResource);
            this.headers.cacheInvalidate = cacheInvalidate;

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
