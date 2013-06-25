var Settings,
    GhostBookshelf = require('./base'),
    uuid = require('node-uuid'),
    _ = require('underscore'),
    errors = require('../errorHandling'),
    when = require('when');

// Each setting is saved as a separate row in the database,
// but the overlying API treats them as a single key:value mapping
Settings = GhostBookshelf.Model.extend({
    tableName: 'settings',
    hasTimestamps: true,
    defaults: function () {
        return {
            uuid: uuid.v4(),
            type: 'general'
        };
    }
}, {
    read: function (_key) {
        // Allow for just passing the key instead of attributes
        if (!_.isObject(_key)) {
            _key = { key: _key };
        }
        return GhostBookshelf.Model.read.call(this, _key);
    },

    edit: function (_data) {
        var settings = this;
        if (!Array.isArray(_data)) {
            _data = [_data];
        }
        return when.map(_data, function (item) {
            // Accept an array of models as input
            if (item.toJSON) { item = item.toJSON(); }
            return settings.forge({ key: item.key }).fetch().then(function (setting) {
                return setting.set('value', item.value).save();
            }, errors.logAndThrowError);
        });
    }
});

module.exports = {
    Settings: Settings
};