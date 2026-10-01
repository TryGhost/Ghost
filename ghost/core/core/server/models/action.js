const ghostBookshelf = require('./base');
const { METAFIELD_ENTITIES } = require('../services/metafields/entities');
const { metafieldTables } = require('../services/metafields/entity');

// Metafield definitions are owned by a raw-knex service rather than the Bookshelf
// registry. Actions still need a read model for `include=resource` to recognise
// their polymorphic resource type and load the current field definition.
const metafieldDefinitionResources = METAFIELD_ENTITIES.map((entity) => [
  ghostBookshelf.Model.extend({ tableName: metafieldTables(entity.table).definitions }),
  entity.definitionResource,
]);

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

      candidates.push(...metafieldDefinitionResources);

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
