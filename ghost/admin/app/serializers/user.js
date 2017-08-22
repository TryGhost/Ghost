import ApplicationSerializer from 'ghost-admin/serializers/application';
import EmbeddedRecordsMixin from 'ember-data/serializers/embedded-records-mixin';
import {pluralize} from 'ember-inflector';

export default ApplicationSerializer.extend(EmbeddedRecordsMixin, {
    attrs: {
        roles: {embedded: 'always'},
        lastLoginUTC: {key: 'last_seen'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    },

    extractSingle(store, primaryType, payload) {
        let root = this.keyForAttribute(primaryType.modelName);
        let pluralizedRoot = pluralize(primaryType.modelName);

        payload[root] = payload[pluralizedRoot][0];
        delete payload[pluralizedRoot];

        return this._super(...arguments);
    },

    normalizeSingleResponse(store, primaryModelClass, payload) {
        let root = this.keyForAttribute(primaryModelClass.modelName);
        let pluralizedRoot = pluralize(primaryModelClass.modelName);

        if (payload[pluralizedRoot]) {
            payload[root] = payload[pluralizedRoot][0];
            delete payload[pluralizedRoot];
        }

        return this._super(...arguments);
    }
});
