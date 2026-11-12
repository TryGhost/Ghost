const ghostBookshelf = require('./base');
const { ACTION_KINDS } = require('../services/action-log/models');

// A kind of resource that a service logs actions about is not a Bookshelf model. Each gets a
// read model over the table its kind declares, so `include=resource` can load its resource.
const kindCandidates = Object.entries(ACTION_KINDS).map(([resourceType, kind]) => [
  ghostBookshelf.Model.extend({ tableName: kind.table }),
  resourceType,
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
      return [...this.candidates(), ...kindCandidates];
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
