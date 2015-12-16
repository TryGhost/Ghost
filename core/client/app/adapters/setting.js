import ApplicationAdapter from 'ghost/adapters/application';

export default ApplicationAdapter.extend({
    updateRecord(store, type, record) {
        let data = {};
        let serializer = store.serializerFor(type.modelName);

        // remove the fake id that we added onto the model.
        delete record.id;

        // use the SettingSerializer to transform the model back into
        // an array of settings objects like the API expects
        serializer.serializeIntoHash(data, type, record);

        // use the ApplicationAdapter's buildURL method but do not
        // pass in an id.
        return this.ajax(this.buildURL(type.modelName), 'PUT', {data});
    }
});
