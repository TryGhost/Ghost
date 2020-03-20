var ghostBookshelf = require('./base'),
    AppSetting,
    AppSettings;

AppSetting = ghostBookshelf.Model.extend({
    tableName: 'app_settings',

    app: function app() {
        return this.belongsTo('App');
    }
});

AppSettings = ghostBookshelf.Collection.extend({
    model: AppSetting
});

module.exports = {
    AppSetting: ghostBookshelf.model('AppSetting', AppSetting),
    AppSettings: ghostBookshelf.collection('AppSettings', AppSettings)
};
