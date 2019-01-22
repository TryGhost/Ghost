// Dirty requires!
const labs = require('../../../../services/labs');

module.exports = function registerHelpers(ghost) {
    ghost.helpers.register('input_email', require('./input_email'));

    ghost.helpers.register('subscribe_form', function labsEnabledHelper() {
        let self = this, args = arguments;

        return labs.enabledHelper({
            flagKey: 'subscribers',
            flagName: 'Subscribers',
            helperName: 'subscribe_form',
            helpUrl: 'https://docs.ghost.org/faq/enable-subscribers-feature/'
        }, () => {
            return require('./subscribe_form').apply(self, args);
        });
    });
};
