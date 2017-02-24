// Settings Lib
// @TODO: eventually much of this logic will move into this lib
// For now we are providing a unified interface
var SettingsModel = require('../models/settings').Settings,
    SettingsAPI = require('../api').settings;

module.exports = {
    init: function init() {
        return SettingsModel
            .populateDefaults()
            .then(function () {
                return SettingsAPI.updateSettingsCache();
            });
    }
};
