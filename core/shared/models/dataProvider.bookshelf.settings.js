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

    SettingsProvider.prototype.read = function(_key) {
        // Allow for just passing the key instead of attributes
        if (_.isString(_key)) {
            _key = { key: _key };
        }
        return BaseProvider.prototype.read.call(this, _key);
    };

    SettingsProvider.prototype.edit = function(_data) {
        return when.all(_.map(_data, function (value, key) {
            return this.model.forge({ key: key }).fetch().then(function (setting) {
                return setting.set('value', value).save();
            });
        }, this));
    };

    module.exports = SettingsProvider;
}());