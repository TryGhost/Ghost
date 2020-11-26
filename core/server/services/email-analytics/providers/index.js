module.exports = {
    init({config, settings, logging = console}) {
        return {
            get mailgun() {
                const Mailgun = require('./mailgun');
                return new Mailgun({config, settings, logging});
            }
        };
    }
};
