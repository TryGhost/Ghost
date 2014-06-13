import ApplicationSerializer from 'ghost/serializers/application';

var PostSerializer = ApplicationSerializer.extend({
    serializeHasMany: function (record, json, relationship) {
        var key = relationship.key;

        if (key === 'tags') {
            json[key] = Ember.get(record, key).map(function (tag) {
                return tag.serialize({ includeId: true });
            });
        } else {
            this._super.apply(this, arguments);
        }
    }
});

export default PostSerializer;
