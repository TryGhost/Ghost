const _ = require('lodash');
const limitService = require('../services/limits');
const ghostBookshelf = require('./base');
const {NoPermissionError} = require('@tryghost/errors');

const Integration = ghostBookshelf.Model.extend({
    tableName: 'integrations',

    actionsCollectCRUD: true,
    actionsResourceType: 'integration',

    relationships: ['api_keys', 'webhooks'],
    relationshipConfig: {
        api_keys: {
            editable: true
        },
        webhooks: {
            editable: true
        }
    },

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

    onCreated: function onCreated(model, options) {
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
    },

    defaultRelations: function defaultRelations(methodName, options) {
        if (['edit', 'add', 'destroy'].indexOf(methodName) !== -1) {
            options.withRelated = _.union(['api_keys'], options.withRelated || []);
        }

        return options;
    },

    async permissible(integrationModel, action, context, attrs, loadedPerms, hasUserPermission, hasApiKeyPermission) {
        const isAdd = (action === 'add');

        if (isAdd && limitService.isLimited('customIntegrations')) {
            // CASE: if your site is limited to a certain number of custom integrations
            // Inviting a new custom integration requires we check we won't go over the limit
            await limitService.errorIfWouldGoOverLimit('customIntegrations');
        }

        if (!hasUserPermission || !hasApiKeyPermission) {
            throw new NoPermissionError();
        }
    },

    async getInternalFrontendKey(options) {
        options = options || {};

        options.withRelated = ['api_keys'];

        return this.findOne({slug: 'ghost-internal-frontend'}, options);
    }
});

const Integrations = ghostBookshelf.Collection.extend({
    model: Integration
});

module.exports = {
    Integration: ghostBookshelf.model('Integration', Integration),
    Integrations: ghostBookshelf.collection('Integrations', Integrations)
};
