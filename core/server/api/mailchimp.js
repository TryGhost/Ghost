var Mailchimp = require('mailchimp-api-v3'),
    settingsCache = require('../settings/cache'),
    errors = require('../errors'),
    pipeline = require('../utils/pipeline'),
    _ = require('lodash'),
    mailchimp;

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

            return mailchimp.get({
                path: '/lists'
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            // TODO: validation/permissions
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function formatResponse(result) {
            // remove details that the client doesn't need
            var lists = _.map(result.lists, function (list) {
                return {
                    id: list.id,
                    name: list.name
                };
            });

            return {
                lists: lists
            };
        }).catch(function handleMailchimpError(error) {
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
        });
    }
};

module.exports = mailchimp;
