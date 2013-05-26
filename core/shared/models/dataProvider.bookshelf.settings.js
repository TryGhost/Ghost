(function() {
    "use strict";

    var _ = require('underscore'),
        when = require('when'),
        util = require('util'),
        models = require('./models'),
        BaseProvider = require('./dataProvider.bookshelf.base'),
        SettingsProvider;

    /**
     * The Posts data provider implementation for Bookshelf.
     */
    SettingsProvider = function () {
        BaseProvider.call(this, models.Setting, models.Settings);
    };

    util.inherits(SettingsProvider, BaseProvider);

    SettingsProvider.prototype.read = function(_key, callback) {
        // Allow for just passing the key instead of attributes
        if (_.isString(_key)) {
            _key = { key: _key };
        }

        BaseProvider.prototype.read.call(this, _key, callback);
    };

    SettingsProvider.prototype.edit = function(_data, callback) {
        var self = this;

        when.all(_.map(_data, function (value, key) {
            return self.model.forge({ key: key }).fetch().then(function (setting) {
                return setting.set('value', value).save();
            });
        })).then(function (settings) {
            callback(null, settings);
        }, callback);
    };

    module.exports = SettingsProvider;
}());