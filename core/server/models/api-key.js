const omit = require('lodash/omit');
const crypto = require('crypto');
const ghostBookshelf = require('./base');
const {Role} = require('./role');

/*
 * Uses birthday problem estimation to calculate chance of collision
 * d = 16^26        // 26 char hex string
 * n = 10,000,000   // 10 million
 *
 *       (-n x (n-1)) / 2d
 * 1 - e^
 *
 *
 *           17
 * ~= 4 x 10^
 *
 * ref: https://medium.freecodecamp.org/how-long-should-i-make-my-api-key-833ebf2dc26f
 * ref: https://en.wikipedia.org/wiki/Birthday_problem#Approximations
 *
 * 26 char hex string = 13 bytes
 * 64 char hex string JWT secret = 32 bytes
 */
const createSecret = (type) => {
    const bytes = type === 'content' ? 13 : 32;
    return crypto.randomBytes(bytes).toString('hex');
};

const ApiKey = ghostBookshelf.Model.extend({
    tableName: 'api_keys',

    defaults() {
        const secret = createSecret(this.get('type'));

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
    },

    getAction(event, options) {
        const actor = this.getActor(options);

        // @NOTE: we ignore internal updates (`options.context.internal`) for now
        if (!actor) {
            return;
        }

        // @TODO: implement context
        return {
            event: event,
            resource_id: this.id || this.previous('id'),
            resource_type: 'api_key',
            actor_id: actor.id,
            actor_type: actor.type
        };
    }
}, {
    refreshSecret(data, options) {
        const secret = createSecret(data.type);
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
