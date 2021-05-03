const ghostBookshelf = require('./base');
const i18n = require('../../shared/i18n');
const errors = require('@tryghost/errors');

let Label;
let Labels;

Label = ghostBookshelf.Model.extend({

    tableName: 'labels',

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'label' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, attrs, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, attrs, options) {
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
        const options = Label.filterOptions(unfilteredOptions, 'toJSON');
        const attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        return attrs;
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
            resource_type: 'label',
            actor_id: actor.id,
            actor_type: actor.type
        };
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

        // whitelists for the `options` hash argument on methods, by method name.
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

    destroy: function destroy(unfilteredOptions) {
        const options = this.filterOptions(unfilteredOptions, 'destroy', {extraAllowedProperties: ['id']});
        options.withRelated = ['members'];

        return this.forge({id: options.id})
            .fetch(options)
            .then(function destroyLabelsAndMember(label) {
                if (!label) {
                    return Promise.reject(new errors.NotFoundError({
                        message: i18n.t('errors.api.labels.labelNotFound')
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
