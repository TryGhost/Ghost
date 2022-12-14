const omit = require('lodash/omit');
const security = require('@tryghost/security');
const ghostBookshelf = require('./base');
const {Role} = require('./role');

const ApiKey = ghostBookshelf.Model.extend({
    tableName: 'api_keys',

    actionsCollectCRUD: true,
    actionsResourceType: 'api_key',

    defaults() {
        const secret = security.secret.create(this.get('type'));

        return {
            secret
        };
    },

    role() {
        return this.belongsTo('Role');
    },

    integration() {
        return this.belongsTo('Integration');
    },

    user() {
        return this.belongsTo('User');
    },

    format(attrs) {
        return omit(attrs, 'role');
    },

    onSaving(model, attrs, options) {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        // enforce roles which are currently hardcoded
        // - admin key = Adminstrator role
        // - content key = no role
        if (this.hasChanged('type') || this.hasChanged('role_id')) {
            if (this.get('type') === 'admin') {
                return Role.findOne({name: attrs.role || 'Admin Integration'}, Object.assign({}, options, {columns: ['id']}))
                    .then((role) => {
                        this.set('role_id', role.get('id'));
                    });
            }

            if (this.get('type') === 'content') {
                this.set('role_id', null);
            }
        }
    },
    onUpdated(model, options) {
        if (this.previous('secret') !== this.get('secret')) {
            this.addAction(model, 'refreshed', options);
        }
    }
}, {
    refreshSecret(data, options) {
        const secret = security.secret.create(data.type);
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
