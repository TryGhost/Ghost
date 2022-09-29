const logging = require('@tryghost/logging');
module.exports = {
    async up() {
        logging.warn('Skipping migration - noop');
    },
    async down() {
        logging.warn('Skipping migration - noop');
    }
};
