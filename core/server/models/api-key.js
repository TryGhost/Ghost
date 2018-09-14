const crypto = require('crypto');
const ghostBookshelf = require('./base');

const ApiKey = ghostBookshelf.Model.extend({
    tableName: 'api_keys',

    defaults() {
        // 512bit key for HS256 JWT signing
        let secret = crypto.randomBytes(64).toString('hex');

        return {
            secret
        };
    },

    role() {
        return this.belongsTo('Role');
    },

    integration() {
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
