var ghostBookshelf = require('./base'),
    App = require('./app'),
    AppSetting,
    AppSettings;

AppSetting = ghostBookshelf.Model.extend({
    tableName: 'app_settings',

    app: function () {
        return this.belongsTo(App);
    }
});

AppSettings = ghostBookshelf.Collection.extend({
    model: AppSetting
});

module.exports = {
    AppSetting: AppSetting,
    AppSettings: AppSettings
};