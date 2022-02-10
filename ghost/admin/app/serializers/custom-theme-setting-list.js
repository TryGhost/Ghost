import ApplicationSerializer from './application';
import {EmbeddedRecordsMixin} from '@ember-data/serializer/rest';

export default class CustomThemeSettingList extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    attrs = {
        customThemeSettings: {embedded: 'always'}
    };

    serializeIntoHash(hash, type, record, options) {
        // replace the whole request hash with the embedded custom_theme_settings array
        const settings = this.serialize(record, options);
        Object.assign(hash, settings);
    }

    normalizeSingleResponse(store, primaryModelClass, _payload, id, requestType) {
        // response will come back as a custom theme settings array, not a "customThemeSettingList" array/object
        // make it look like the list model so Ember Data does it's thing and doesn't complain
        const payload = {
            customThemeSettingLists: [Object.assign({id: 0}, _payload)]
        };
        return super.normalizeSingleResponse(store, primaryModelClass, payload, id, requestType);
    }
}
