import Ember from 'ember';
import DS from 'ember-data';
import ApplicationSerializer from 'ghost/serializers/application';

export default ApplicationSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
        roles: {embedded: 'always'}
    },

    extractSingle: function (store, primaryType, payload) {
        var root = this.keyForAttribute(primaryType.modelName),
            pluralizedRoot = Ember.String.pluralize(primaryType.modelName);

        payload[root] = payload[pluralizedRoot][0];
        delete payload[pluralizedRoot];

        return this._super.apply(this, arguments);
    },

    normalizeSingleResponse: function (store, primaryModelClass, payload) {
        var root = this.keyForAttribute(primaryModelClass.modelName),
            pluralizedRoot = Ember.String.pluralize(primaryModelClass.modelName);

        payload[root] = payload[pluralizedRoot][0];
        delete payload[pluralizedRoot];

        return this._super.apply(this, arguments);
    }
});
