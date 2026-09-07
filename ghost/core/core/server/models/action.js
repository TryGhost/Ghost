const ghostBookshelf = require('./base');

// Member metafields are owned by a raw-knex service rather than the Bookshelf
// registry. Actions still need a read model for `include=resource` to recognise
// their polymorphic resource type and load the current field definition.
const MemberMetafieldResource = ghostBookshelf.Model.extend({
  tableName: 'members_metafields',
});

const Action = ghostBookshelf.Model.extend(
  {
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

      candidates.push([MemberMetafieldResource, 'member_custom_field']);

      return candidates;
    },

    actor() {
      return this.morphTo('actor', ['actor_type', 'actor_id'], ...this.candidates());
    },

    resource() {
      return this.morphTo(
        'resource',
        ['resource_type', 'resource_id'],
        ...this.resourceCandidates(),
      );
    },
  },
  {
    orderDefaultOptions: function orderDefaultOptions() {
      return {
        created_at: 'DESC',
      };
    },

    add(data, unfilteredOptions = {}) {
      const options = this.filterOptions(unfilteredOptions, 'add');
      return ghostBookshelf.Model.add.call(this, data, options);
    },
  },
);

module.exports = {
  Action: ghostBookshelf.model('Action', Action),
};
