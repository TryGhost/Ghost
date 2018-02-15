var crypto         = require('crypto'),
    uuid           = require('uuid'),
    ghostBookshelf = require('./base'),
    config         = require('../config'),
    Client,
    Clients;

Client = ghostBookshelf.Model.extend({

    tableName: 'clients',

    defaults: function defaults() {
        // @TODO: we cannot delete this ugly check here, because ALL routing tests rely on a static client secret
        var env = config.get('env'),
            secret = env.indexOf('testing') !== 0 ? crypto.randomBytes(6).toString('hex') : 'not_available';

        return {
            uuid: uuid.v4(),
            secret: secret,
            status: 'development',
            type: 'ua'
        };
    },

    trustedDomains: function trustedDomains() {
        return this.hasMany('ClientTrustedDomain', 'client_id');
    }
}, {
    /**
    * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
    * @param {String} methodName The name of the method to check valid options for.
    * @return {Array} Keys allowed in the `options` hash of the model's method.
    */
    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['columns', 'withRelated']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    }
});

Clients = ghostBookshelf.Collection.extend({
    model: Client
});

module.exports = {
    Client: ghostBookshelf.model('Client', Client),
    Clients: ghostBookshelf.collection('Clients', Clients)
};
