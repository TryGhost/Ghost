module.exports = function registerHelpers(ghost) {
    ghost.helpers.register('input_email', require('./input_email'));

    ghost.helpers.register('subscribe_form', function registerSubscriberForm() {
        var self = this,
            args = arguments;

        return require('./subscribe_form').apply(self, args);
    });
};
