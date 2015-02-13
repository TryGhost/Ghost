import ApplicationSerializer from 'ghost/serializers/application';

var TagSerializer = ApplicationSerializer.extend({
    serializeIntoHash: function (hash, type, record, options) {
        options = options || {};
        options.includeId = true;

        var root = Ember.String.pluralize(type.typeKey),
            data = this.serialize(record, options);

        // Properties that exist on the model but we don't want sent in the payload

        delete data.uuid;
        delete data.post_count;

        hash[root] = [data];
    }
});

export default TagSerializer;
