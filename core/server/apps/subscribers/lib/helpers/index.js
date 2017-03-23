// Dirty requires!
var labs = require('../../../../utils/labs');

module.exports = function registerHelpers(ghost) {
    ghost.helpers.register('input_email', require('./input_email'));

    ghost.helpers.register('subscribe_form', function labsEnabledHelper() {
        var self = this,
            args = arguments;

        return labs.enabledHelper({
            flagKey: 'subscribers',
            flagName: 'Subscribers',
            helperName: 'subscribe_form',
            helpUrl: 'http://support.ghost.org/subscribers-beta/'
        }, function executeHelper() {
            return require('./subscribe_form').apply(self, args);
        });
    });
};
