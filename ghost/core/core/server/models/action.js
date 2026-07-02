const ghostBookshelf = require('./base');

const Action = ghostBookshelf.Model.extend({
    tableName: 'actions',

    candidates() {
        return Object.keys(ghostBookshelf.registry.models).map((key) => {
            const model = ghostBookshelf.registry.models[key];
            return [model, model.prototype.tableName.replace(/s$/, '')];
        });
    },

    resourceCandidates() {
        const candidates = this.candidates();

        const User = ghostBookshelf.registry.models.User;
        if (User) {
            candidates.push([User, 'security_action']);
        }

        return candidates;
    },

    actor() {
        return this.morphTo('actor', ['actor_type', 'actor_id'], ...this.candidates());
    },

    resource() {
        return this.morphTo('resource', ['resource_type', 'resource_id'], ...this.resourceCandidates());
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {
            created_at: 'DESC'
        };
    },

    add(data, unfilteredOptions = {}) {
        const options = this.filterOptions(unfilteredOptions, 'add');
        return ghostBookshelf.Model.add.call(this, data, options);
    }
});

module.exports = {
    Action: ghostBookshelf.model('Action', Action)
};
