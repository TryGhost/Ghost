var ghostBookshelf = require('./base'),

    Client,
    Clients;

Client = ghostBookshelf.Model.extend({

    tableName: 'clients'

});

Clients = ghostBookshelf.Collection.extend({
    model: Client
});

module.exports = {
    Client: Client,
    Clients: Clients
};