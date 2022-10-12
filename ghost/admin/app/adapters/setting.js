import ApplicationAdapter from 'ghost-admin/adapters/application';
import {pluralize} from 'ember-inflector';

export default class Setting extends ApplicationAdapter {
    updateRecord(store, type, record) {
        let data = {};
        let serializer = store.serializerFor(type.modelName);

        // remove the fake id that we added onto the model.
        delete record.id;

        // use the SettingSerializer to transform the model back into
        // an array of settings objects like the API expects
        serializer.serializeIntoHash(data, type, record);

        // Do not send empty data to the API
        // This can probably be removed then this is fixed:
        // https://github.com/TryGhost/Ghost/blob/main/ghost/api-framework/lib/validators/input/all.js#L128
        let root = pluralize(type.modelName);
        if (data[root].length === 0) {
            return Promise.resolve();
        }

        // use the ApplicationAdapter's buildURL method but do not
        // pass in an id.
        return this.ajax(this.buildURL(type.modelName), 'PUT', {data});
    }
}
