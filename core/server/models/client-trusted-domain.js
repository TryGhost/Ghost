var ghostBookshelf = require('./base'),

    ClientTrustedDomain,
    ClientTrustedDomains;

ClientTrustedDomain = ghostBookshelf.Model.extend({
    tableName: 'client_trusted_domains',
    hasTimestamps: false,

    // override for base function since we don't have
    // a created_by field for trusted domains
    creating: function creating(newObj, attr, options) {
        ghostBookshelf.Model.prototype.creating.call(this, newObj, attr, options);

        this.unset('created_by');
    },

    // override for base function since we don't have
    // a updated_by field for trusted domains
    saving: function saving(newObj, attr, options) {
        ghostBookshelf.Model.prototype.saving.call(this, newObj, attr, options);

        this.unset('updated_by');
    }
});

ClientTrustedDomains = ghostBookshelf.Collection.extend({
    model: ClientTrustedDomain
});

module.exports = {
    ClientTrustedDomain: ghostBookshelf.model('ClientTrustedDomain', ClientTrustedDomain),
    ClientTrustedDomains: ghostBookshelf.collection('ClientTrustedDomains', ClientTrustedDomains)
};
