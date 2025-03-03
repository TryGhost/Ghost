const ghostBookshelf = require('./base');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    labelNotFound: 'Label not found.'
};

let Label;
let Labels;

Label = ghostBookshelf.Model.extend({

    tableName: 'labels',

    actionsCollectCRUD: true,
    actionsResourceType: 'label',

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'label' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
    },

    onSaving: function onSaving(newLabel, attr, options) {
        const self = this;

        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);
        // Make sure name is trimmed of extra spaces
        let name = this.get('name') && this.get('name').trim();
        this.set('name', name);
        if (this.hasChanged('slug') || (!this.get('slug') && this.get('name'))) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Label, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
                .then(function then(slug) {
                    self.set({slug: slug});
                });
        }
    },

    members: function members() {
        return this.belongsToMany('Member', 'members_labels', 'label_id', 'member_id');
    },

    toJSON: function toJSON(unfilteredOptions) {
        const attrs = ghostBookshelf.Model.prototype.toJSON.call(this, unfilteredOptions);
        return attrs;
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {
            name: 'ASC',
            created_at: 'DESC'
        };
    },

    permittedOptions: function permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);

        // allowlists for the `options` hash argument on methods, by method name.
        // these are the only options that can be passed to Bookshelf / Knex.
        const validOptions = {
            findAll: ['columns'],
            findOne: ['columns'],
            destroy: ['destroyAll']
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
            }
        };
    },

    destroy: function destroy(unfilteredOptions) {
        const options = this.filterOptions(unfilteredOptions, 'destroy', {extraAllowedProperties: ['id']});
        options.withRelated = ['members'];

        return this.forge({id: options.id})
            .fetch(options)
            .then(function destroyLabelsAndMember(label) {
                if (!label) {
                    return Promise.reject(new errors.NotFoundError({
                        message: tpl(messages.labelNotFound)
                    }));
                }

                return label.related('members')
                    .detach(null, options)
                    .then(function destroyLabels() {
                        return label.destroy(options);
                    });
            });
    }
});

Labels = ghostBookshelf.Collection.extend({
    model: Label
});

module.exports = {
    Label: ghostBookshelf.model('Label', Label),
    Labels: ghostBookshelf.collection('Labels', Labels)
};
