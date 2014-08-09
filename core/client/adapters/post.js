import EmbeddedRelationAdapter from 'ghost/adapters/embedded-relation-adapter';

var PostAdapter = EmbeddedRelationAdapter.extend({
    createRecord: function (store, type, record) {
        var data = {},
            serializer = store.serializerFor(type.typeKey),
            url = this.buildURL(type.typeKey);

        // make the server return with the tags embedded
        url = url + '?include=tags';

        // use the PostSerializer to transform the model back into
        // an array with a post object like the API expects
        serializer.serializeIntoHash(data, type, record);

        return this.ajax(url, 'POST', { data: data });
    },

    updateRecord: function (store, type, record) {
        var data = {},
            serializer = store.serializerFor(type.typeKey),
            id = Ember.get(record, 'id'),
            url = this.buildURL(type.typeKey, id);

        // make the server return with the tags embedded
        url = url + '?include=tags';

        // use the PostSerializer to transform the model back into
        // an array of posts objects like the API expects
        serializer.serializeIntoHash(data, type, record);

        // use the ApplicationAdapter's buildURL method
        return this.ajax(url, 'PUT', { data: data });
    }
});

export default PostAdapter;
