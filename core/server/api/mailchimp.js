var Mailchimp       = require('mailchimp-api-v3'),
    Promise         = require('bluebird'),
    _               = require('lodash'),
    dataProvider    = require('../models'),
    errors          = require('../errors'),
    pipeline        = require('../utils/pipeline'),
    settingsCache   = require('../settings/cache'),
    utils           = require('../utils'),

    docName = 'mailchimp',
    mailchimp,
    handleMailchimpError;

handleMailchimpError = function handleMailchimpError(error) {
    // TODO: return a custom error type here?
    if (error.title === 'API Key Invalid' || error.message.indexOf('invalid api key') > -1) {
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
            context: error.detail + ' (' + error.type + ')'
        });
    }

    // TODO: keep this or just `throw error`?
    throw new errors.InternalServerError({
        code: 'MAILCHIMP',
        message: error.message
    });
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
     * - [ ] fix create members request
     * - [ ] return stats
     * - [ ] error handling
     *
     * Flow:
     * - fetch all MailChimp list members
     * - create subscribers for unknown e-mail addresses
     * - update name and status of subscribers for known e-mail addresses
     * - push all subscribers to MailChimp
     *
     * @return {[type]} [description]
     */
    sync: function sync(options) {
        var tasks;

        function doQuery(options) {
            var settings = settingsCache.get('mailchimp'),
                mailchimp = new Mailchimp(settings.apiKey);

            // grab all subscribers from the DB ready for comparisons/updates
            return dataProvider.Subscriber.findAll().then(function(subscribers) {
                // fetch all members, use a batch query because a normal get query
                // may time out. Assumes no list has more then 100m members 😬
                return mailchimp.batch({
                    method: 'get',
                    path: '/lists/{list_id}/members',
                    path_params: {
                        list_id: settings.activeList.id
                    },
                    query: {
                        count: 100000000,
                        fields: 'total_items,members.email_address,members.status'
                    }
                }).then(function updateSubscribers(result) {
                    var updatePromises = [];

                    // for each member, find a matching subscriber and update.
                    _.forEach(result.members, function (member) {
                        var subscriber = subscribers.findWhere({email: member.email_address});

                        // TODO: we may want to transform the status values here,
                        // MailChimp will return one of:
                        // pending, subscribed, cleaned, unsubscribed
                        subscriber.set('status', member.status);

                        updatePromises.push(subscriber.save());

                        // remove the model from the collection so we can use the
                        // remaining models to create new list members later
                        subscribers.remove(subscriber);
                    });

                    return Promise.all(updatePromises);
                }).then(function createNewListMembers() {
                    var members = [];

                    subscribers.forEach(function (subscriber) {
                        members.push({
                            email_address: subscriber.get('email'),
                            status: subscriber.get('status')
                        })
                    });

                    console.log(members);

                    if (members.length > 0) {
                        return mailchimp.request({
                            method: 'post',
                            path: '/lists/{list_id}/members',
                            path_params: {
                                list_id: settings.activeList.id
                            },
                            body: {
                                members: members,
                                update_existing: false
                            }
                        }).catch(function (error) {
                            console.log(error);
                        });
                    } else {
                        Promise.resolve({});
                    }
                });
            });
        }

        tasks = [
            doQuery
        ];

        return pipeline(tasks, options).catch(handleMailchimpError);
    }
};

module.exports = mailchimp;
