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

    permittedAttributes: ['id', 'uuid', 'key', 'value', 'type', 'created_at', 'created_by', 'updated_at', 'update_by'],

    defaults: function () {
        return {
            uuid: uuid.v4(),
            type: 'general'
        };
    },

    initialize: function () {
        this.on('saving', this.saving, this);
        this.on('saving', this.validate, this);
    },

    validate: function () {
        // TODO: validate value, check type is one of the allowed values etc
        GhostBookshelf.validator.check(this.get('key'), "Setting key cannot be blank").notEmpty();
        GhostBookshelf.validator.check(this.get('type'), "Setting type cannot be blank").notEmpty();
    },

    saving: function () {
        // Deal with the related data here

        // Remove any properties which don't belong on the post model
        this.attributes = this.pick(this.permittedAttributes);
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