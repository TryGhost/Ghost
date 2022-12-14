import ApplicationAdapter from 'ghost-admin/adapters/application';

export default class CustomThemeSettingListAdapter extends ApplicationAdapter {
    // we use `custom-theme-setting-list` model as a workaround for saving all
    // custom theme setting records in one request so it uses the base model url
    pathForType() {
        return 'custom_theme_settings';
    }

    // there's no custom theme setting creation
    // newListModel.save() acts as an overall update request so force a PUT
    createRecord(store, type, snapshot) {
        return this.saveRecord(store, type, snapshot, {method: 'PUT'}, 'createRecord');
    }
}
