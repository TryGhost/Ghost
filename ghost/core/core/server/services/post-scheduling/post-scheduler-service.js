const moment = require('moment');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

const urlUtils = require('../../../shared/url-utils');
const {getSignedAdminToken} = require('../../adapters/scheduling/utils');

const SCHEDULED_RESOURCES = ['post', 'page'];

class PostSchedulerService {
    constructor({apiUrl, internalKeys, adapter, events} = {}) {
        if (!apiUrl) {
            throw new errors.IncorrectUsageError({message: 'post-scheduling: no apiUrl was provided'});
        }
        if (!internalKeys) {
            throw new errors.IncorrectUsageError({message: 'post-scheduling: no internalKeys was provided'});
        }

        this.apiUrl = apiUrl;
        this.adapter = adapter;
        this.internalKeys = internalKeys;

        adapter.run();

        SCHEDULED_RESOURCES.forEach((resource) => {
            events.on(`${resource}.scheduled`, async (model) => {
                try {
                    const key = await internalKeys.get('ghost-scheduler');
                    adapter.schedule(this.normalize({model, apiUrl, key, resourceType: resource}));
                } catch (err) {
                    logging.error({
                        event: {name: 'post-scheduling.schedule.error'},
                        err,
                        resource,
                        id: model.get('id')
                    }, 'Failed to schedule resource');
                }
            });

            /** We want to do reschedule as (unschedule + schedule) due to how token(+url) is generated
             * We want to first remove existing schedule by generating a matching token(+url)
             * followed by generating a new token(+url) for the new schedule
            */
            events.on(`${resource}.rescheduled`, async (model) => {
                try {
                    const key = await internalKeys.get('ghost-scheduler');
                    adapter.unschedule(this.normalize({model, apiUrl, key, resourceType: resource}, 'unscheduled'));
                    adapter.schedule(this.normalize({model, apiUrl, key, resourceType: resource}));
                } catch (err) {
                    logging.error({
                        event: {name: 'post-scheduling.reschedule.error'},
                        err,
                        resource,
                        id: model.get('id')
                    }, 'Failed to reschedule resource');
                }
            });

            events.on(`${resource}.unscheduled`, async (model) => {
                try {
                    const key = await internalKeys.get('ghost-scheduler');
                    adapter.unschedule(this.normalize({model, apiUrl, key, resourceType: resource}, 'unscheduled'));
                } catch (err) {
                    logging.error({
                        event: {name: 'post-scheduling.unschedule.error'},
                        err,
                        resource,
                        id: model.get('id')
                    }, 'Failed to unschedule resource');
                }
            });
        });
    }

    /**
     * Re-issue every queued schedule. On boot the caller passes the resources
     * loaded from the DB. For key rotation, the caller additionally passes
     * `previousKey` so unschedule URLs reproduce the entries the adapter
     * already has (signed under the previous secret); schedule URLs are
     * reissued under the current secret.
     *
     * @param {Object} scheduledResources - {post: [...], page: [...]}
     * @param {Object} [opts]
     * @param {{id: string, secret: string}} [opts.previousKey]
     */
    async reschedule(scheduledResources, {previousKey} = {}) {
        const currentKey = await this.internalKeys.get('ghost-scheduler');
        const unscheduleKey = previousKey ?? currentKey;

        for (const resourceType of Object.keys(scheduledResources)) {
            for (const model of scheduledResources[resourceType]) {
                this.adapter.unschedule(
                    this.normalize({model, apiUrl: this.apiUrl, key: unscheduleKey, resourceType}),
                    {bootstrap: true}
                );
                this.adapter.schedule(
                    this.normalize({model, apiUrl: this.apiUrl, key: currentKey, resourceType})
                );
            }
        }
    }

    /**
     * @description Normalize model data into scheduler notation.
     * @param {Object} options
     * @return {Object}
     */
    normalize({model, apiUrl, resourceType, key}, event = '') {
        const resource = `${resourceType}s`;
        const publishedAt = (event === 'unscheduled') ? model.previous('published_at') : model.get('published_at');
        const signedAdminToken = getSignedAdminToken({publishedAt, apiUrl, key});
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

module.exports = PostSchedulerService;
