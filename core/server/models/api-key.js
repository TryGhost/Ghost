const crypto = require('crypto');
const ghostBookshelf = require('./base');
const {Role} = require('./role');

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
    },

    onSaving(/* model, attrs, options */) {
        let tasks = [];

        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        // enforce roles which are currently hardcoded
        // - admin key = Adminstrator role
        // - content key = no role
        if (this.hasChanged('type')) {
            if (this.get('type') === 'admin') {
                tasks.setAdminRole = Role.findOne({name: 'Administrator'}, {columns: ['id']})
                    .then((role) => {
                        this.set('role_id', role.get('id'));
                    });
            }

            if (this.get('type') === 'content') {
                this.set('role_id', null);
            }
        }

        return Promise.props(tasks);
    }
}, {
    add(data, unfilteredOptions) {
        const options = ApiKey.filterOptions(unfilteredOptions, 'add');

        return ghostBookshelf.Model.add.call(this, data, options);
    }
});

const ApiKeys = ghostBookshelf.Collection.extend({
    model: ApiKey
});

module.exports = {
    ApiKey: ghostBookshelf.model('ApiKey', ApiKey),
    ApiKeys: ghostBookshelf.collection('ApiKeys', ApiKeys)
};
