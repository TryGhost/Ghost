const ghostBookshelf = require('./base');

const Integration = ghostBookshelf.Model.extend({
    tableName: 'integrations',

    api_keys: function apiKeys() {
        return this.hasMany('ApiKey');
    }
});

const Integrations = ghostBookshelf.Collection.extend({
    model: Integration
});

module.exports = {
    Integration: ghostBookshelf.model('Integration', Integration),
    Integrations: ghostBookshelf.collection('Integrations', Integrations)
};
