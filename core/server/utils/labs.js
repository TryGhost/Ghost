var _   = require('lodash'),
    api = require('../api'),
    flagIsSet;

flagIsSet = function flagIsSet(flag) {
    return api.settings.read({key: 'labs', context: {internal: true}}).then(function (response) {
        var labs,
            labsValue;

        labs = _.find(response.settings, function (setting) {
            return setting.key === 'labs';
        });

        if (!labs || !labs.value) {
            return false;
        }

        try {
            labsValue = JSON.parse(labs.value);
        } catch (e) {
            return false;
        }

        return !!labsValue[flag] && labsValue[flag] === true;
    });
};

module.exports.isSet = flagIsSet;
