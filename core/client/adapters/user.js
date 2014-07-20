import EmbeddedRelationAdapter from 'ghost/adapters/embedded-relation-adapter';

var UserAdapter = EmbeddedRelationAdapter.extend({
    createRecord: function (store, type, record) {
        var data = {},
            serializer = store.serializerFor(type.typeKey),
            url = this.buildURL(type.typeKey);

        // Ask the API to include full role objects in its response
        url += '?include=roles';

        // Use the UserSerializer to transform the model back into
        // an array of user objects like the API expects
        serializer.serializeIntoHash(data, type, record);

        // Use the url from the ApplicationAdapter's buildURL method
        return this.ajax(url, 'POST', { data: data });
    },

    updateRecord: function (store, type, record) {
        var data = {},
            serializer = store.serializerFor(type.typeKey),
            id = Ember.get(record, 'id'),
            url = this.buildURL(type.typeKey, id);

        // Ask the API to include full role objects in its response
        url += '?include=roles';

        // Use the UserSerializer to transform the model back into
        // an array of user objects like the API expects
        serializer.serializeIntoHash(data, type, record);

        // Use the url from the ApplicationAdapter's buildURL method
        return this.ajax(url, 'PUT', { data: data });
    }
});

export default UserAdapter;
