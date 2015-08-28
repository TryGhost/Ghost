var ghostBookshelf = require('./base'),

    ClientTrustedDomain,
    ClientTrustedDomains;

ClientTrustedDomain = ghostBookshelf.Model.extend({
    tableName: 'client_trusteddomains'
});

ClientTrustedDomains = ghostBookshelf.Collection.extend({
    model: ClientTrustedDomain
});

module.exports = {
    ClientTrustedDomain: ghostBookshelf.model('ClientTrustedDomain', ClientTrustedDomain),
    ClientTrustedDomains: ghostBookshelf.collection('ClientTrustedDomains', ClientTrustedDomains)
};
