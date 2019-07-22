const ghostBookshelf = require('./base');

const Integration = ghostBookshelf.Model.extend({
    tableName: 'integrations',

    relationships: ['api_keys', 'webhooks'],

    relationshipBelongsTo: {
        api_keys: 'api_keys',
        webhooks: 'webhooks'
    },

    defaults() {
        return {
            type: 'custom'
        };
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'integration' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    add(data, options) {
        const addIntegration = () => {
            return ghostBookshelf.Model.add.call(this, data, options)
                .then(({id}) => {
                    return this.findOne({id}, options);
                });
        };

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;

                return addIntegration();
            });
        }

        return addIntegration();
    },

    edit(data, options) {
        const editIntegration = () => {
            return ghostBookshelf.Model.edit.call(this, data, options)
                .then(({id}) => {
                    return this.findOne({id}, options);
                });
        };

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;

                return editIntegration();
            });
        }

        return editIntegration();
    },

    onSaving(integration, attrs, options) {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Integration, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
                .then((slug) => {
                    this.set({slug});
                });
        }
    },

    onCreated: function onCreated(model, response, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    permittedAttributes(...args) {
        return ghostBookshelf.Model.prototype.permittedAttributes.apply(this, args).concat(this.relationships);
    },

    api_keys: function apiKeys() {
        return this.hasMany('ApiKey', 'integration_id');
    },

    webhooks: function webhooks() {
        return this.hasMany('Webhook', 'integration_id');
    }
}, {
    permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);

        if (methodName === 'findOne') {
            options = options.concat(['filter']);
        }

        return options;
    }
});

const Integrations = ghostBookshelf.Collection.extend({
    model: Integration
});

module.exports = {
    Integration: ghostBookshelf.model('Integration', Integration),
    Integrations: ghostBookshelf.collection('Integrations', Integrations)
};
