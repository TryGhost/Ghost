var Mailchimp = require('mailchimp-api-v3'),
    settingsCache = require('../settings/cache'),
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
            let apiKey = options.apiKey || settingsCache.get('mailchimp').apiKey;
            let mailchimp = new Mailchimp(apiKey);

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
            // TODO: error handling
            var lists = _.map(result.lists, function (list) {
                return {
                    id: list.id,
                    name: list.name
                };
            });

            return {
                lists: lists
            };
        });
    }
};

module.exports = mailchimp;
