(function () {
    "use strict";

    var Setting,
        Settings,
        GhostBookshelf = require('./base'),
        _ = require('underscore'),
        when = require('when'),
        SettingsProvider;

    Setting = GhostBookshelf.Model.extend({

        tableName: 'settings',

        hasTimestamps: true

    }, {

        read: function (_key) {
            // Allow for just passing the key instead of attributes
            if (!_.isObject(_key)) {
                _key = { key: _key };
            }
            return GhostBookshelf.Model.read.call(this, _key);
        },

        edit: function (_data) {
            return when.all(_.map(_data, function (value, key) {
                return this.forge({ key: key }).fetch().then(function (setting) {
                    return setting.set('value', value).save();
                });
            }, this));
        }

    });

    Settings = GhostBookshelf.Collection.extend({
        model: Setting
    });

    module.exports = {
        Setting: Setting,
        Settings: Settings
    };

}());