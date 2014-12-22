import ApplicationSerializer from 'ghost/serializers/application';

var PostSerializer = ApplicationSerializer.extend(DS.EmbeddedRecordsMixin, {
    // settings for the EmbeddedRecordsMixin.
    attrs: {
        tags: {embedded: 'always'}
    },

    normalize: function (type, hash) {
        // this is to enable us to still access the raw author_id
        // without requiring an extra get request (since it is an
        // async relationship).
        hash.author_id = hash.author;

        return this._super(type, hash);
    },

    extractSingle: function (store, primaryType, payload) {
        var root = this.keyForAttribute(primaryType.typeKey),
            pluralizedRoot = Ember.String.pluralize(primaryType.typeKey);

        // make payload { post: { title: '', tags: [obj, obj], etc. } }.
        // this allows ember-data to pull the embedded tags out again,
        // in the function `updatePayloadWithEmbeddedHasMany` of the
        // EmbeddedRecordsMixin (line: `if (!partial[attribute])`):
        // https://github.com/emberjs/data/blob/master/packages/activemodel-adapter/lib/system/embedded_records_mixin.js#L499
        payload[root] = payload[pluralizedRoot][0];
        delete payload[pluralizedRoot];

        return this._super.apply(this, arguments);
    },

    keyForAttribute: function (attr) {
        return attr;
    },

    keyForRelationship: function (relationshipName) {
        // this is a hack to prevent Ember-Data from deleting our `tags` reference.
        // ref: https://github.com/emberjs/data/issues/2051
        // @TODO: remove this once the situation becomes clearer what to do.
        if (relationshipName === 'tags') {
            return 'tag';
        }

        return relationshipName;
    },

    serializeIntoHash: function (hash, type, record, options) {
        options = options || {};
        options.includeId = true;

        // We have a plural root in the API
        var root = Ember.String.pluralize(type.typeKey),
            data = this.serialize(record, options);

        // Properties that exist on the model but we don't want sent in the payload

        delete data.uuid;
        delete data.html;
        // Inserted locally as a convenience.
        delete data.author_id;
        // Read-only virtual property.
        delete data.url;

        hash[root] = [data];
    }
});

export default PostSerializer;
