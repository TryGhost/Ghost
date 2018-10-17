const ghostBookshelf = require('./base');

const Integration = ghostBookshelf.Model.extend({
    tableName: 'integrations',

    relationships: ['api_keys', 'webhooks'],

    relationshipBelongsTo: {
        api_keys: 'api_keys',
        webhooks: 'webhooks'
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

    onSaving(newIntegration, attr, options) {
        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Integration, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
                .then((slug) => {
                    this.set({slug});
                });
        }
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
});

const Integrations = ghostBookshelf.Collection.extend({
    model: Integration
});

module.exports = {
    Integration: ghostBookshelf.model('Integration', Integration),
    Integrations: ghostBookshelf.collection('Integrations', Integrations)
};
