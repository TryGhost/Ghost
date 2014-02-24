var ghostBookshelf = require('./base'),
    App = require('./app'),
    AppSetting,
    AppSettings;

AppSetting = ghostBookshelf.Model.extend({
    tableName: 'app_settings',

    validate: function () {
        ghostBookshelf.validator.check(this.get('key'), 'Key cannot be blank').notEmpty();
        ghostBookshelf.validator.check(this.get('key'), 'Key maximum length is 150 characters.').len(0, 150);
        ghostBookshelf.validator.check(this.get('app_id'), 'App cannot be blank').notEmpty();
        ghostBookshelf.validator.check(this.get('type'), 'Type maximum length is 150 characters.').len(0, 150);

        return true;
    },

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