const _ = require('lodash');
const url = require('url');
const crypto = require('crypto');
const moment = require('moment');
const exec = require('child_process').exec;
const util = require('util');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const debug = require('@tryghost/debug')('update-check');

const internal = {context: {internal: true}};

const messages = {
    checkingForUpdatesFailedError: 'Checking for updates failed, your site will continue to function.',
    checkingForUpdatesFailedHelp: 'If you get this error repeatedly, please seek help from {url}'
};

// The service's current response is a single notification at the top
// level; the wrapped and bare-array shapes are accepted for forward-compat.
function normalizeNotifications(response) {
    if (!response) {
        return [];
    }
    if (_.isArray(response.notifications)) {
        return response.notifications;
    }
    if (_.isArray(response)) {
        return response;
    }
    if (response.messages) {
        return [response];
    }
    return [];
}

/**
 * Update Checker Class
 *
 * Makes a request to Ghost.org to request release & custom notifications.
 * The service is provided in return for users opting in to anonymous usage data collection.
 *
 * Blog owners can opt-out of update checks by setting `privacy: { useUpdateCheck: false }` in their config file.
 */
class UpdateCheckService {
    /**
     *
     * @param {Object} options
     * @param {Object} options.api - set of Ghost's API methods needed for update check to function
     * @param {Object} options.api.settings - Settings API methods
     * @param {Function} options.api.settings.read - method allowing to read Ghost's settings
     * @param {Function} options.api.settings.edit - method allowing to edit Ghost's settings
     * @param {Object} options.api.posts - Posts API methods
     * @param {Function} options.api.posts.browse - method allowing to read Ghost's posts
     * @param {Object} options.api.users - Users API methods
     * @param {Function} options.api.users.browse - method allowing to read Ghost's users
     * @param {Object} options.api.notifications - Notification API methods
     * @param {Function} options.api.notifications.add - method allowing to add Ghost notifications
     * @param {Object} options.config
     * @param {Object} options.config.mail
     * @param {string} options.config.env
     * @param {string} options.config.databaseType
     * @param {string} options.config.checkEndpoint - update check service URL
     * @param {boolean} [options.config.isPrivacyDisabled]
     * @param {string[]} [options.config.notificationGroups] - example values ["migration", "something"]
     * @param {boolean} [options.config.rethrowErrors] - allows to force throwing errors (useful in worker threads)
     * @param {string} options.config.siteUrl - Ghost instance URL
     * @param {boolean} [options.config.forceUpdate]
     * @param {string} options.config.ghostVersion - Ghost instance version
     * @param {Function} options.request - a HTTP request proxy function
     * @param {Object} options.notificationEmailService - service that sends a sanitised, shell-rendered notification email to a recipient list
    */
    constructor({api, config, request, notificationEmailService}) {
        this.api = api;
        this.config = config;
        this.logging = logging;
        this.request = request;
        this.notificationEmailService = notificationEmailService;
    }

    nextCheckTimestamp() {
        const now = Math.round(new Date().getTime() / 1000);
        return now + (24 * 3600);
    }

    /**
     * @description Centralized error handler for the update check unit.
     *
     * CASES:
     *   - the update check service returns an error
     *   - error during collecting blog stats
     *
     * We still need to ensure that we set the "next_update_check" to a new value, otherwise no more
     * update checks will happen.
     *
     * @param err
     */
    updateCheckError(err) {
        this.api.settings.edit({
            settings: [{
                key: 'next_update_check',
                value: this.nextCheckTimestamp()
            }]
        }, internal);

        err.context = tpl(messages.checkingForUpdatesFailedError);
        err.help = tpl(messages.checkingForUpdatesFailedHelp, {url: 'https://ghost.org/docs/'});

        this.logging.error({
            event: {name: 'update-check.error'},
            err
        }, 'Update check failed');

        if (this.config.rethrowErrors) {
            throw err;
        }
    }

    /**
     * @description Collect stats from your blog.
     * @returns {Promise}
     */
    async updateCheckData() {
        let data = {};
        let mailConfig = this.config.mail;

        data.ghost_version = this.config.ghostVersion;
        data.node_version = process.versions.node;
        data.env = this.config.env;
        data.database_type = this.config.databaseType;
        data.email_transport = mailConfig &&
            (mailConfig.options && mailConfig.options.service ?
                mailConfig.options.service :
                mailConfig.transport);

        // Telemetry sources are gathered in parallel; each is independently
        // failure-tolerant so one bad source (e.g. a model-layer SQL error
        // from posts.browse) doesn't prevent the rest of the data from being
        // sent. Thunks (not pre-evaluated promises) so synchronous throws
        // turn into rejections rather than escaping the resolution loop.
        const sources = {
            db_hash: () => this.api.settings.read(_.extend({key: 'db_hash'}, internal)),
            active_theme: () => this.api.settings.read(_.extend({key: 'active_theme'}, internal)),
            posts: () => this.api.posts.browse(),
            users: () => this.api.users.browse({...internal, include: ['roles']}),
            npm: () => util.promisify(exec)('npm -v')
        };

        const entries = Object.entries(sources);
        const settled = await Promise.allSettled(entries.map(async ([, fn]) => fn()));

        const values = {};
        const failures = [];
        settled.forEach((result, i) => {
            const source = entries[i][0];
            if (result.status === 'fulfilled') {
                values[source] = result.value;
            } else {
                failures.push(source);
                this.logging.error({
                    event: {name: 'update-check.telemetry.error'},
                    err: result.reason,
                    source
                }, 'Failed to gather telemetry source');
            }
        });

        if (failures.length) {
            this.logging.warn({
                event: {name: 'update-check.telemetry.partial'},
                failures,
                attemptedCount: entries.length,
                failedCount: failures.length
            }, 'Update check telemetry collected partially');
        }

        const hash = values.db_hash && values.db_hash.settings && values.db_hash.settings[0];
        const theme = values.active_theme && values.active_theme.settings && values.active_theme.settings[0];
        const posts = values.posts;
        const users = values.users;
        const npm = values.npm;

        const blogUrl = this.config.siteUrl;
        const parsedBlogUrl = url.parse(blogUrl);

        data.url = blogUrl;
        data.blog_id = hash && hash.value
            ? crypto.createHash('md5').update(parsedBlogUrl.hostname + parsedBlogUrl.pathname.replace(/\//, '') + hash.value).digest('hex')
            : '';
        data.theme = theme ? theme.value : '';
        data.post_count = posts && posts.meta && posts.meta.pagination ? posts.meta.pagination.total : 0;
        data.user_count = users && users.users && users.users.length ? users.users.length : 0;

        let blogCreatedAt = null;
        if (users && users.users && users.users.length > 0) {
            const ownerUser = users.users.find(user => user.roles && user.roles.some(role => role.name === 'Owner'));
            if (ownerUser) {
                blogCreatedAt = ownerUser.created_at;
            } else {
                blogCreatedAt = users.users[0].created_at;
            }
        }

        data.blog_created_at = blogCreatedAt ? moment(blogCreatedAt).unix() : '';
        data.npm_version = npm && npm.stdout ? npm.stdout.trim() : '';

        return data;
    }

    /**
     * @description Perform request to update check service.
     *
     * With the privacy setting `useUpdateCheck` you can control if you want to expose data/stats from your blog to the
     * service. Enabled or disabled, you will receive the latest notification available from the service.
     *
     * @see https://ghost.org/docs/concepts/config/#privacy
     * @returns {Promise}
     */
    async updateCheckRequest() {
        const reqData = await this.updateCheckData();

        let reqObj = {
            timeout: {
                request: 1000
            },
            headers: {}
        };

        let checkEndpoint = this.config.checkEndpoint;
        let checkMethod = this.config.isPrivacyDisabled ? 'GET' : 'POST';
        reqObj.method = checkMethod;

        // CASE: Expose stats and do a check-in
        if (checkMethod === 'POST') {
            reqObj.json = reqData;
        } else {
            reqObj.searchParams = {
                ghost_version: reqData.ghost_version
            };
        }

        debug('Request Update Check Service', checkEndpoint);
        this.logging.info({
            event: {name: 'update-check.request.start'},
            endpoint: checkEndpoint,
            method: checkMethod,
            ghostVersion: this.config.ghostVersion
        }, 'Sending update check request');

        try {
            const response = await this.request(checkEndpoint, reqObj);
            this.logging.info({
                event: {name: 'update-check.request.complete'},
                endpoint: checkEndpoint,
                statusCode: response && response.statusCode
            }, 'Update check request completed');
            return JSON.parse(response.body);
        } catch (err) {
            // CASE: no notifications available, ignore
            if (err.statusCode === 404) {
                this.logging.info({
                    event: {name: 'update-check.request.no-notifications'},
                    endpoint: checkEndpoint
                }, 'Update check service returned 404, no notifications available');
                return {
                    next_check: this.nextCheckTimestamp(),
                    notifications: []
                };
            }

            this.logging.error({
                event: {name: 'update-check.request.error'},
                err,
                endpoint: checkEndpoint,
                statusCode: err.statusCode
            }, 'Update check request failed');

            // CASE: service returns JSON error, deserialize into JS error
            if (err.response && err.response.body && typeof err.response.body === 'object') {
                throw errors.utils.deserialize(err.response.body);
            } else {
                throw err;
            }
        }
    }

    /**
     * @description Handle a successful response from the update check service.
     *
     * 1. Updates `next_update_check` so we know when the next call is due.
     * 2. Filters incoming notifications against the configured notification groups.
     * 3. Calls a custom helper to add each remaining notification to the database.
     *
     * The service returns:
     *
     * {
     *   next_check: 1555608722,
     *   notifications: [
     *     {
     *       id: 20,
     *       version: 'all4',
     *       messages: [{
     *         id: 'f8ff6c80-aa61-11e7-a126-6119te37e2b8',
     *         version: '^6',
     *         content: 'Hallouuuu custom',
     *         top: true,
     *         dismissible: true,
     *         type: 'info'
     *       }],
     *       created_at: '2021-10-06T07:00:00.000Z',
     *       custom: 1
     *     }
     *   ]
     * }
     *
     * The 'all' notification group is reserved for general custom notifications
     * that every self-hosted blog can receive; other groups can be opted into
     * via the `notificationGroups` config.
     *
     * @param {Object} response
     * @return {Promise}
     */
    async updateCheckResponse(response) {
        let notificationGroups = (this.config.notificationGroups || []).concat(['all']);

        debug('Notification Groups', notificationGroups);
        debug('Response Update Check Service', response);

        await this.api.settings.edit({
            settings: [{
                key: 'next_update_check',
                value: response.next_check
            }]
        }, internal);

        let notifications = normalizeNotifications(response);

        // CASE: Hook into received notifications and decide whether you are allowed to receive custom group messages.
        if (notificationGroups.length) {
            notifications = notifications.filter(function (notification) {
                // CASE: release notification, keep
                if (!notification.custom) {
                    return true;
                }

                // CASE: filter out messages based on your groups
                return _.includes(notificationGroups.map(function (groupIdentifier) {
                    if (notification && notification.version && notification.version.match(new RegExp(groupIdentifier))) {
                        return true;
                    }

                    return false;
                }), true) === true;
            });
        }

        for (const notification of notifications) {
            await this.createCustomNotification(notification);
        }
    }

    /**
     * @description Create a Ghost notification and call the API controller.
     *
     * @param {Object} notification
     * @return {Promise}
     */
    async createCustomNotification(notification) {
        if (!notification || !notification.messages || notification.messages.length === 0) {
            debug(`Skipping notification creation as there are no messages to process`);
            return;
        }

        debug(`creating custom notifications for ${notification.messages.length} notifications`);

        const siteUrl = this.config.siteUrl;

        for (const message of notification.messages) {
            const toAdd = {
                custom: notification.custom,
                createdAt: moment(notification.created_at).toDate(),
                status: message.status || 'alert',
                type: message.type || 'info',
                id: message.id,
                dismissible: Object.prototype.hasOwnProperty.call(message, 'dismissible') ? message.dismissible : true,
                top: !!message.top,
                message: message.content
            };

            if (toAdd.type === 'alert') {
                try {
                    const {users} = await this.api.users.browse({
                        filter: 'status:active+roles.name:[Owner,Administrator]',
                        ...internal
                    });
                    const to = users.map(user => user.email);
                    await this.notificationEmailService.send({
                        to,
                        subject: `Action required: Critical alert from Ghost instance ${siteUrl}`,
                        content: toAdd.message
                    });
                } catch (err) {
                    this.logging.error(err);
                    if (this.config.rethrowErrors) {
                        throw err;
                    }
                }
            }

            debug('Add Custom Notification', toAdd);
            await this.api.notifications.add({notifications: [toAdd]}, {context: {internal: true}});
        }
    }
    /**
     * @description Entry point to trigger the update check unit.
     *
     * Based on a settings value, we check if `next_update_check` is less than now to decide whether
     * we should request the update check service (http://updates.ghost.org) or not.
     *
     * @returns {Promise}
     */
    async check() {
        this.logging.info({
            event: {name: 'update-check.check.start'},
            ghostVersion: this.config.ghostVersion,
            forceUpdate: Boolean(this.config.forceUpdate)
        }, 'Update check started');

        try {
            const result = await this.api.settings.read(_.extend({key: 'next_update_check'}, internal));

            const nextUpdateCheck = result.settings[0];
            const nextCheckAt = nextUpdateCheck && nextUpdateCheck.value;

            // CASE: Next update check should happen now?
            // @NOTE: You can skip this check by adding a config value. This is helpful for developing.
            if (!this.config.forceUpdate && nextCheckAt && nextCheckAt > moment().unix()) {
                this.logging.info({
                    event: {name: 'update-check.check.skipped-by-gate'},
                    nextCheckAt
                }, 'Update check skipped, next check is scheduled in the future');
                return;
            }

            const response = await this.updateCheckRequest();
            const notifications = normalizeNotifications(response);

            this.logging.info({
                event: {name: 'update-check.response.received'},
                notificationCount: notifications.length
            }, 'Update check response received');

            const result2 = await this.updateCheckResponse(response);

            this.logging.info({
                event: {name: 'update-check.check.complete'}
            }, 'Update check completed');

            return result2;
        } catch (err) {
            this.updateCheckError(err);
        }
    }
}

module.exports = UpdateCheckService;
