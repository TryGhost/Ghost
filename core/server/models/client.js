var ghostBookshelf = require('./base'),

    Client,
    Clients;

Client = ghostBookshelf.Model.extend({
    tableName: 'clients',
    trustedDomains: function trustedDomains() {
        return this.hasMany('ClientTrustedDomain', 'client_id');
    }
});

Clients = ghostBookshelf.Collection.extend({
    model: Client
});

module.exports = {
    Client: ghostBookshelf.model('Client', Client),
    Clients: ghostBookshelf.collection('Clients', Clients)
};
