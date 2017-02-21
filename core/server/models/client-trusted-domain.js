var ghostBookshelf = require('./base'),

    ClientTrustedDomain,
    ClientTrustedDomains;

ClientTrustedDomain = ghostBookshelf.Model.extend({
    tableName: 'client_trusted_domains',
    hasTimestamps: false,

    // override for base function since we don't have
    // a created_by field for trusted domains
    onCreating: function onCreating(model, attr, options) {
        ghostBookshelf.Model.prototype.onCreating.call(this, model, attr, options);
        this.unset('created_by');
    },

    // override for base function since we don't have
    // a updated_by field for trusted domains
    onSaving: function onSaving(model, attr, options) {
        ghostBookshelf.Model.prototype.onSaving.call(this, model, attr, options);
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
