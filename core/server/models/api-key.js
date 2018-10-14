const crypto = require('crypto');
const ghostBookshelf = require('./base');
const {Role} = require('./role');

const createSecret = () => crypto.randomBytes(64).toString('hex');

const ApiKey = ghostBookshelf.Model.extend({
    tableName: 'api_keys',

    defaults() {
        // 512bit key for HS256 JWT signing
        const secret = createSecret();

        return {
            secret
        };
    },

    role() {
        return this.belongsTo('Role');
    },

    // if an ApiKey does not have a related Integration then it's considered
    // "internal" and shouldn't show up in the UI. Example internal API Keys
    // would be the ones used for the scheduler and backup clients
    integration() {
        return this.belongsTo('Integration');
    },

    onSaving(model, attrs, options) {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        // enforce roles which are currently hardcoded
        // - admin key = Adminstrator role
        // - content key = no role
        if (this.hasChanged('type') || this.hasChanged('role_id')) {
            if (this.get('type') === 'admin') {
                return Role.findOne({name: 'Admin Integration'}, Object.assign({}, options, {columns: ['id']}))
                    .then((role) => {
                        this.set('role_id', role.get('id'));
                    });
            }

            if (this.get('type') === 'content') {
                this.set('role_id', null);
            }
        }
    }
}, {
    refreshSecret(data, options) {
        const secret = createSecret();
        return this.edit(Object.assign({}, data, {secret}), options);
    }
});

const ApiKeys = ghostBookshelf.Collection.extend({
    model: ApiKey
});

module.exports = {
    ApiKey: ghostBookshelf.model('ApiKey', ApiKey),
    ApiKeys: ghostBookshelf.collection('ApiKeys', ApiKeys)
};
