// Dirty requires!
var hbs = require('express-hbs'),
    logging = require('../../../../logging'),
    i18n = require('../../../../i18n'),
    labs = require('../../../../utils/labs'),

    errorMessages = [
        i18n.t('warnings.helpers.helperNotAvailable', {helperName: 'subscribe_form'}),
        i18n.t('warnings.helpers.apiMustBeEnabled', {helperName: 'subscribe_form', flagName: 'subscribers'}),
        i18n.t('warnings.helpers.seeLink', {url: 'http://support.ghost.org/subscribers-beta/'})
    ];

module.exports = function registerHelpers(ghost) {
    var err;

    ghost.helpers.register('input_email', require('./input_email'));

    ghost.helpers.register('subscribe_form', function labsEnabledHelper() {
        if (labs.isSet('subscribers') === true) {
            return require('./subscribe_form').apply(this, arguments);
        }

        err = new Error();
        err.message = i18n.t('warnings.helpers.helperNotAvailable', {helperName: 'subscribe_form'});
        err.context = i18n.t('warnings.helpers.apiMustBeEnabled', {helperName: 'subscribe_form', flagName: 'subscribers'});
        err.help = i18n.t('warnings.helpers.seeLink', {url: 'http://support.ghost.org/subscribers-beta/'});

        logging.error(err);

        return new hbs.handlebars.SafeString('<script>console.error("' + errorMessages.join(' ') + '");</script>');
    });
};
