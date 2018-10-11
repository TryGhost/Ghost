const ghostBookshelf = require('./base');

const Integration = ghostBookshelf.Model.extend({
    tableName: 'integrations',

    relationships: ['api_keys'],

    relationshipBelongsTo: {
        api_keys: 'api_keys'
    },

    permittedAttributes(...args) {
        return ghostBookshelf.Model.prototype.permittedAttributes.apply(this, args).concat(this.relationships);
    },

    api_keys: function apiKeys() {
        return this.hasMany('ApiKey', 'integration_id');
    }
});

const Integrations = ghostBookshelf.Collection.extend({
    model: Integration
});

module.exports = {
    Integration: ghostBookshelf.model('Integration', Integration),
    Integrations: ghostBookshelf.collection('Integrations', Integrations)
};
