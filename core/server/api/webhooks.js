var Promise      = require('bluebird'),
    dataProvider = require('../models'),
    errors       = require('../errors'),
    i18n         = require('../i18n'),
    webhooks;

webhooks = {
    trigger: function trigger(options) {
        var key = options.key,
            param = options[0],
            tasks;

        // find webhook and pass on to actual API endpoint or 404
        return dataProvider.Webhook.findOne({key: '' + key + param})
            .then(function (webhook) {
                if (webhook) {
                    // TODO: this feels really dirty, am I doing something stupid? 😬
                    var handler = require('./' + key);

                    // TODO: this doesn't pass the request details which will
                    // probably be needed for some webhooks
                    return handler.webhook(options);
                }

                return Promise.reject(new errors.NotFoundError({message: i18n.t('errors.api.webhooks.webhookNotFound')}));
            });
    }
};

module.exports = webhooks;
