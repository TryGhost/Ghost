const ghostBookshelf = require('./base');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const DatabaseInfo = require('@tryghost/database-info');

const messages = {
  labelNotFound: 'Label not found.',
};

const Label = ghostBookshelf.Model.extend(
  {
    tableName: 'labels',

    actionsCollectCRUD: true,
    actionsResourceType: 'label',

    emitChange: function emitChange(event, options) {
      const eventToTrigger = 'label' + '.' + event;
      ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, options) {
      const result = ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

      model.emitChange('added', options);

      return result;
    },

    onUpdated: function onUpdated(model, options) {
      const result = ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

      model.emitChange('edited', options);

      return result;
    },

    onDestroyed: function onDestroyed(model, options) {
      const result = ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

      model.emitChange('deleted', options);

      return result;
    },

    onSaving: function onSaving(newLabel, attr, options) {
      const self = this;

      ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);
      // Make sure name is trimmed of extra spaces
      const name = this.get('name') && this.get('name').trim();
      this.set('name', name);
      if (this.hasChanged('slug') || (!this.get('slug') && this.get('name'))) {
        // Pass the new slug through the generator to strip illegal characters, detect duplicates
        return ghostBookshelf.Model.generateSlug(Label, this.get('slug') || this.get('name'), {
          transacting: options.transacting,
        }).then(function then(slug) {
          self.set({ slug: slug });
        });
      }
    },

    members: function members() {
      return this.belongsToMany('Member', 'members_labels', 'label_id', 'member_id');
    },

    toJSON: function toJSON(unfilteredOptions) {
      const attrs = ghostBookshelf.Model.prototype.toJSON.call(this, unfilteredOptions);
      return attrs;
    },
  },
  {
    orderDefaultOptions: function orderDefaultOptions() {
      return {
        name: 'ASC',
        created_at: 'DESC',
      };
    },

    permittedOptions: function permittedOptions(methodName) {
      let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);

      // allowlists for the `options` hash argument on methods, by method name.
      // these are the only options that can be passed to Bookshelf / Knex.
      const validOptions = {
        findAll: ['columns'],
        findOne: ['columns'],
        destroy: ['destroyAll'],
      };

      if (validOptions[methodName]) {
        options = options.concat(validOptions[methodName]);
      }

      return options;
    },

    countRelations() {
      return {
        members(modelOrCollection) {
          modelOrCollection.query('columns', 'labels.*', (qb) => {
            qb.count('members.id')
              .from('members')
              .leftOuterJoin('members_labels', 'members.id', 'members_labels.member_id')
              .whereRaw('members_labels.label_id = labels.id')
              .as('count__members');
          });
        },
      };
    },

    /**
     * Reads the labels that may match the given names case-insensitively, as plain
     * `{id, name}` rows. The result can include non-matches, so callers compare the
     * names themselves.
     *
     * Member saves run this once per member, and imports save members row by row,
     * so reading every label here made each row cost grow with the site's label
     * count. MySQL compares `labels.name` with a case-insensitive collation, so an
     * indexed lookup narrows the read to the named labels. The names are passed as
     * given rather than lower-cased, so a database with a case-sensitive collation
     * still finds exact matches. SQLite compares names case-sensitively and its
     * LOWER() folds only ASCII, so there every label is read, without hydrating
     * models.
     *
     * @param {string[]} names
     * @param {object} [unfilteredOptions]
     * @returns {import('knex').Knex.QueryBuilder}
     */
    findCandidatesByName(names, unfilteredOptions = {}) {
      const query = ghostBookshelf.knex('labels').select('id', 'name');

      if (DatabaseInfo.isMySQL(ghostBookshelf.knex)) {
        query.whereIn('name', names);
      }

      if (unfilteredOptions.transacting) {
        query.transacting(unfilteredOptions.transacting);
      }

      return query;
    },

    destroy: function destroy(unfilteredOptions) {
      const options = this.filterOptions(unfilteredOptions, 'destroy', {
        extraAllowedProperties: ['id'],
      });
      options.withRelated = ['members'];

      const destroyLabel = async (transacting) => {
        // Detaching changes the relations of the members, so lock them as an edit would
        await ghostBookshelf
          .model('Member')
          .lockLinkedForUpdate(
            'members_labels',
            'member_id',
            { label_id: options.id },
            { transacting },
          );

        const label = await this.forge({ id: options.id }).fetch({ ...options, transacting });
        if (!label) {
          throw new errors.NotFoundError({
            message: tpl(messages.labelNotFound),
          });
        }

        await label.related('members').detach(null, { ...options, transacting });
        return label.destroy({ ...options, transacting });
      };

      return options.transacting
        ? destroyLabel(options.transacting)
        : ghostBookshelf.transaction(destroyLabel);
    },
  },
);

const Labels = ghostBookshelf.Collection.extend({
  model: Label,
});

module.exports = {
  Label: ghostBookshelf.model('Label', Label),
  Labels: ghostBookshelf.collection('Labels', Labels),
};
