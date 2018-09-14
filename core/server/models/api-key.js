const ghostBookshelf = require('./base');

const ApiKey = ghostBookshelf.Model.extend({
    tableName: 'api_keys',

    role: function role() {
        return this.belongsTo('Role');
    },

    integration: function integration() {
        return this.belongsTo('Integration');
    }
}, {

});

const ApiKeys = ghostBookshelf.Collection.extend({
    model: ApiKey
});

module.exports = {
    ApiKey: ghostBookshelf.model('ApiKey', ApiKey),
    ApiKeys: ghostBookshelf.collection('ApiKeys', ApiKeys)
};
