var ghostBookshelf = require('./base'),
    events         = require('../events'),
    crypto          = require('crypto'),

    Client,
    Clients;

Client = ghostBookshelf.Model.extend({
    tableName: 'clients',

    emitChange: function emitChange(event) {
        events.emit('client' + '.' + event, this);
    },

    initialize: function initialize() {
        ghostBookshelf.Model.prototype.initialize.apply(this, arguments);

        this.on('created', function onCreated(model) {
            model.emitChange('added');
        });
        this.on('updated', function onUpdated(model) {
            model.emitChange('edited');
        });
        this.on('destroyed', function onDestroyed(model) {
            model.emitChange('deleted');
        });
    },

    saving: function saving(newPage, attr, options) {
        /*jshint unused:false*/

        var self = this,
            secret,
            status;

        ghostBookshelf.Model.prototype.saving.apply(this, arguments);

        secret = this.get('secret') || crypto.randomBytes(6).toString('hex');
        this.set('secret', secret.trim());

        status = this.get('status') || 'enabled';
        this.set('status', status.trim());

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Client, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
                .then(function then(slug) {
                    self.set({slug: slug});
                });
        }
    },

    trustedDomains: function trustedDomains() {
        return this.hasMany('ClientTrustedDomain', 'client_id');
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {};
    },

    /**
     * @deprecated in favour of filter
     */
    processOptions: function processOptions(options) {
        return options;
    },

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
                findOne: ['withRelated']
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
