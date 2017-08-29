var Mailchimp       = require('mailchimp-api-v3'),
    Promise         = require('bluebird'),
    _               = require('lodash'),
    moment          = require('moment'),
    config          = require('../config'),
    dataProvider    = require('../models'),
    errors          = require('../errors'),
    pipeline        = require('../utils/pipeline'),
    settingsCache   = require('../settings/cache'),

    mailchimp,
    handleMailchimpError;

// TODO: used for debugging, can be removed later
// require('request').debug = true;

// TODO: the error messages from MailChimp are always in English which is a
// departure from the usual i18n translated messages - is this something we
// need to address?
handleMailchimpError = function handleMailchimpError(error) {
    // TODO: return a custom error type here?
    if (error.title === 'API Key Invalid' || (error.message && error.message.indexOf('invalid api key') > -1)) {
        throw new errors.ValidationError({
            code: 'MAILCHIMP',
            message: error.title || error.message,
            statusCode: 422,
            context: error.detail && error.detail + ' (' + error.type + ')'
        });
    }

    // general catch-all for Mailchimp API errors
    if (error.title) {
        throw new errors.InternalServerError({
            code: 'MAILCHIMP',
            message: error.title,
            statusCode: error.status || 500,
            context: {
                detail: error.detail + ' (' + error.type + ')',
                errors: error.errors
            }
        });
    }

    throw error;
};

mailchimp = {
    /**
     * Get information about all mailing lists in MailChimp account
     *
     * @param  {Object} options
     * @return {Promise<List>} List collection
     */
    fetchLists: function fetchLists(options) {
        var tasks;

        /**
         * ### MailChimp API query
         * Make the API query to the lists endpoint
         * @param  {Object} options
         * @return {[type]}         [description]
         */
        function doQuery(options) {
            var apiKey, mailchimp;

            if (options.apiKey !== null && options.apiKey !== undefined) {
                apiKey = options.apiKey;
            } else {
                apiKey = settingsCache.get('mailchimp').apiKey;
            }

            mailchimp = new Mailchimp(apiKey);

            // NOTE: assumes no-one will have more than 500 lists, we return
            // total_items so at least we can debug in a situation where someone
            // is missing lists in the dropdown
            return mailchimp.get('/lists', {
                fields: 'lists.id,lists.name,total_items',
                count: 500
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            // TODO: validation/permissions - how does this work for non-model endpoints?
            // utils.validate(docName),
            // utils.handlePermissions(docName, 'fetchLists'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).catch(handleMailchimpError);
    },

    /**
     * ### Sync Subscribers with Mailchimp list members
     *
     * Other than adding new subscribers, Ghost doesn't have any way of
     * editing subscriber details or changing subscription status so we treat
     * MailChimp as source-of-truth. We pull details from there to update local
     * records and only push new subscribers back to MailChimp.
     *
     * NOTE: we will need to re-visit this when Ghost has more subscription
     * management features
     *
     * TODO:
     * - [x] fix create members request
     * - [x] return stats
     * - [ ] logging
     *
     * Flow:
     * - fetch all MailChimp list members
     * - update status of subscribers for known e-mail addresses
     * - create subscribers for unknown e-mail addresses
     * - push new subscribers to MailChimp
     *
     * @return {[type]} [description]
     */
    sync: function sync(options) {
        var tasks;

        if (!settingsCache.get('mailchimp').isActive) {
            return Promise.resolve();
        }

        // TODO: this method of pipelining feels weird because each function
        // in the pipeline has a side-effect of modifying `options` instead of
        // returning a new object.

        // the options object is passed along the pipeline being updated by each
        // function. Here we set up properties that are needed later
        function prepareOptions(options) {
            options.settings = settingsCache.get('mailchimp');
            options.mailchimp = new Mailchimp(options.settings.apiKey);
            options.mailchimpErrors = [];
            options.stats = {
                subscribers: {
                    updated: 0,
                    created: 0
                },
                mailchimp: {
                    created: 0,
                    errored: 0
                }
            };

            return options;
        }

        // get all subscribers from the local database - used for comparing
        // against MailChimp list members
        function getSubscribers(options) {
            return dataProvider.Subscriber.findAll(options).then(function (subscribers) {
                options.subscribers = subscribers;
                return options;
            });
        }

        // query all MailChimp list members (assumes no more than 1m members) -
        // used to create new local subscribers and as source-of-truth when
        // updating subscriber statuses
        function getMailchimpListMembers(options) {
            return options.mailchimp.batch({
                method: 'get',
                path: '/lists/{list_id}/members',
                path_params: {
                    list_id: options.settings.activeList.id
                },
                query: {
                    count: 100000000,
                    fields: 'total_items,members.email_address,members.status'
                }
            }).then(function (result) {
                options.listMembers = result.members;
                return options;
            });
        }

        // use MailChimp member details to update or create local subscribers
        function updateOrCreateSubscribers(options) {
            var updateAndCreatePromises = [];

            // for each member, find a matching subscriber and update.
            _.forEach(options.listMembers, function (member) {
                var subscriber = options.subscribers.findWhere({email: member.email_address});

                // we have a local subscriber for this e-mail address
                if (subscriber) {
                    // only update if the MailChimp status has changed
                    if (subscriber.get('status') !== member.status) {
                        // TODO: we may want to transform the status values here,
                        // MailChimp will return one of:
                        // pending, subscribed, cleaned, unsubscribed
                        subscriber.set('status', member.status);

                        updateAndCreatePromises.push(subscriber.save());

                        options.stats.subscribers.updated += 1;
                    }

                    // remove the subscriber from the collection so we can use the
                    // remaining subscribers to create new list members later
                    options.subscribers.remove(subscriber);

                // no local subscriber for this e-mail, let's create one
                } else {
                    updateAndCreatePromises.push(dataProvider.Subscriber.add({
                        email: member.email_address,
                        status: member.status
                    }), options);

                    options.stats.subscribers.created += 1;
                }
            });

            return Promise.all(updateAndCreatePromises).then(function () {
                return options;
            });
        }

        // options.subscribers at this point only includes subscribers that
        // do not exist in the MailChimp list, use these subscribers to create
        // the MailChimp list members
        function createNewMailchimpListMembers(options) {
            var members = [];

            options.subscribers.forEach(function (subscriber) {
                members.push({
                    email_address: subscriber.get('email'),
                    // TODO: we may want to transform the status values here,
                    // MailChimp expects one of:
                    // pending, subscribed, cleaned, unsubscribed
                    status: subscriber.get('status')
                });
            });

            if (members.length > 0) {
                return options.mailchimp.request({
                    method: 'post',
                    path: '/lists/{list_id}',
                    path_params: {
                        list_id: options.settings.activeList.id
                    },
                    body: {
                        members: members,
                        update_existing: false
                    }
                }).then(function (results) {
                    options.stats.mailchimp.created = results.total_created;
                    options.stats.mailchimp.errored = results.error_count;
                    options.mailchimpErrors = results.errors;

                    return options;
                });
            } else {
                return Promise.resolve(options);
            }
        }

        function setSyncDate(options) {
            return dataProvider.Settings.findOne({key: 'mailchimp'}, options)
                .then(function (response) {
                    var mailchimpConfig = JSON.parse(response.attributes.value);

                    mailchimpConfig.lastSyncAt = moment().valueOf();
                    mailchimpConfig.nextSyncAt = moment().add(config.get('times:syncSubscribersInMin') || 1440, 'minutes').valueOf();

                    return dataProvider.Settings.edit([{key: 'mailchimp', value: JSON.stringify(mailchimpConfig)}], options);
                });
        }

        tasks = [
            prepareOptions,
            getSubscribers,
            getMailchimpListMembers,
            updateOrCreateSubscribers,
            createNewMailchimpListMembers,
            setSyncDate
        ];

        return pipeline(tasks, options).then(function returnStats() {
            return {
                stats: options.stats,
                errors: options.mailchimpErrors
            };
        }).catch(handleMailchimpError);
    }
};

module.exports = mailchimp;
