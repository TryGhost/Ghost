// Dirty requires!
var labs = require('../../../../services/labs');

module.exports = function registerHelpers(ghost) {
    ghost.helpers.register('input_email', require('./input_email'));

    ghost.helpers.register('subscribe_form', function labsEnabledHelper() {
        var self = this,
            args = arguments;

        return labs.enabledHelper({
            flagKey: 'subscribers',
            flagName: 'Subscribers',
            helperName: 'subscribe_form',
            helpUrl: 'https://help.ghost.org/hc/en-us/articles/224089787-Subscribers-Beta'
        }, function executeHelper() {
            return require('./subscribe_form').apply(self, args);
        });
    });
};
