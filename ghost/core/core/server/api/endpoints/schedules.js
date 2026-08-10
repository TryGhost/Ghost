const postScheduling = require('../../services/posts/post-scheduling');
const permissions = require('../../services/permissions');
const errors = require('@tryghost/errors');

function setCacheInvalidateHeader(frame, cacheInvalidation) {
    if (cacheInvalidation === true) {
        frame.setHeader('X-Cache-Invalidate', '/*');
    } else if (cacheInvalidation.value) {
        frame.setHeader('X-Cache-Invalidate', cacheInvalidation.value);
    }
}

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
        // Runs the standard post:publish check, but tolerates a missing
        // resource: a scheduler that can't invalidate its jobs may fire one for
        // a post/page that has since been deleted, which should be a no-op
        // rather than a 404 it will retry. Only NotFoundError is swallowed —
        // NoPermissionError and everything else still propagate, so permission
        // enforcement on resources that DO exist is unchanged. The controller's
        // own read then hits the same NotFound and returns the no-op.
        permissions(frame) {
            return permissions.canThis(frame.options.context).publish.post(frame.options.id)
                .catch((err) => {
                    if (errors.utils.isGhostError(err) && err.errorType === 'NotFoundError') {
                        return;
                    }

                    throw err;
                });
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

            const {scheduledResource, preScheduledResource} = await postScheduling.publish(resourceType, frame.options.id, frame.data.force, options);

            const response = {};

            // Nothing to publish — fired ahead of the scheduled time, or the
            // resource was deleted. Respond 2xx with an empty list so the
            // scheduler treats the job as done and does not retry.
            if (!scheduledResource) {
                response[resourceType] = [];
                return response;
            }

            setCacheInvalidateHeader(frame, postScheduling.handleCacheInvalidation(scheduledResource, preScheduledResource));

            response[resourceType] = [scheduledResource];
            return response;
        }
    }
};

module.exports = controller;
