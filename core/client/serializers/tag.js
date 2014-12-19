import ApplicationSerializer from 'ghost/serializers/application';

var TagSerializer = ApplicationSerializer.extend(DS.EmbeddedRecordsMixin, {

    serializeIntoHash: function (hash, type, record, options) {
        options = options || {};

        // We have a plural root in the API
        var root = Ember.String.pluralize(type.typeKey),
            data = this.serialize(record, options);

        // Properties that exist on the model but we don't want sent in the payload

        delete data.post_count;
        delete data.uuid;

        hash[root] = [data];
    }
});

export default TagSerializer;
