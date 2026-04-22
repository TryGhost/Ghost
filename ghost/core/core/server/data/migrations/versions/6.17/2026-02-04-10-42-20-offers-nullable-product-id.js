const logging = require('@tryghost/logging');

// noop: this migration was moved to 6.18
module.exports = {
    async up() {
        logging.warn('Skipping migration - noop');
    },
    async down() {
        logging.warn('Skipping migration - noop');
    }
};
