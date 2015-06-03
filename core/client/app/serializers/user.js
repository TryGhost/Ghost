import Ember from 'ember';
import DS from 'ember-data';
import ApplicationSerializer from 'ghost/serializers/application';

var UserSerializer = ApplicationSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
        roles: {embedded: 'always'}
    },

    extractSingle: function (store, primaryType, payload) {
        var root = this.keyForAttribute(primaryType.modelName),
            pluralizedRoot = Ember.String.pluralize(primaryType.modelName);

        payload[root] = payload[pluralizedRoot][0];
        delete payload[pluralizedRoot];

        return this._super.apply(this, arguments);
    }
});

export default UserSerializer;
