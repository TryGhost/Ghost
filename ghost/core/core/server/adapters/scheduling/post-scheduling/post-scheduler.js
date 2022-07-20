const moment = require('moment');
const errors = require('@tryghost/errors');

const urlUtils = require('../../../../shared/url-utils');
const getSignedAdminToken = require('./scheduling-auth-token');

class PostScheduler {
    constructor({apiUrl, integration, adapter, scheduledResources, events} = {}) {
        if (!apiUrl) {
            throw new errors.IncorrectUsageError({message: 'post-scheduling: no apiUrl was provided'});
        }

        if (Object.keys(scheduledResources).length) {
            // Reschedules all scheduled resources on boot
            // NOTE: We are using reschedule, because custom scheduling adapter could use a database, which needs to be updated
            // and not an in-process implementation!
            Object.keys(scheduledResources).forEach((resourceType) => {
                scheduledResources[resourceType].forEach((model) => {
                    adapter.unschedule(this.normalize({model, apiUrl, integration, resourceType}, 'unscheduled'), {bootstrap: true});
                    adapter.schedule(this.normalize({model, apiUrl, integration, resourceType}));
                });
            });
        }

        adapter.run();

        const SCHEDULED_RESOURCES = ['post', 'page'];
        SCHEDULED_RESOURCES.forEach((resource) => {
            events.on(`${resource}.scheduled`, (model) => {
                adapter.schedule(this.normalize({model, apiUrl, integration, resourceType: resource}));
            });

            /** We want to do reschedule as (unschedule + schedule) due to how token(+url) is generated
             * We want to first remove existing schedule by generating a matching token(+url)
             * followed by generating a new token(+url) for the new schedule
            */
            events.on(`${resource}.rescheduled`, (model) => {
                adapter.unschedule(this.normalize({model, apiUrl, integration, resourceType: resource}, 'unscheduled'));
                adapter.schedule(this.normalize({model, apiUrl, integration, resourceType: resource}));
            });

            events.on(`${resource}.unscheduled`, (model) => {
                adapter.unschedule(this.normalize({model, apiUrl, integration, resourceType: resource}, 'unscheduled'));
            });
        });
    }

    /**
     * @description Normalize model data into scheduler notation.
     * @param {Object} options
     * @return {Object}
     */
    normalize({model, apiUrl, resourceType, integration}, event = '') {
        const resource = `${resourceType}s`;
        const publishedAt = (event === 'unscheduled') ? model.previous('published_at') : model.get('published_at');
        const signedAdminToken = getSignedAdminToken({
            publishedAt,
            apiUrl,
            key: {
                id: integration.api_keys[0].id,
                secret: integration.api_keys[0].secret
            }
        });
        let url = `${urlUtils.urlJoin(apiUrl, 'schedules', resource, model.get('id'))}/?token=${signedAdminToken}`;

        return {
            // NOTE: The scheduler expects a unix timestamp.
            time: moment(publishedAt).valueOf(),
            url: url,
            extra: {
                httpMethod: 'PUT',
                oldTime: model.previous('published_at') ? moment(model.previous('published_at')).valueOf() : null
            }
        };
    }
}

module.exports = PostScheduler;
