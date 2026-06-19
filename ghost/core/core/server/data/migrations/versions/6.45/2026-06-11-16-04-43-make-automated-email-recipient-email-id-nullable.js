const {createSetNullableMigration} = require('../../utils');

const nullableMigration = createSetNullableMigration('automated_email_recipients', 'automated_email_id', {disableForeignKeyChecks: true});

module.exports = {
    config: nullableMigration.config,

    async up(config) {
        await nullableMigration.up(config);
    },

    async down(config) {
        // This should be impossible in practice, but we can't make the column required if anything is null.
        await config.transacting('automated_email_recipients')
            .whereNull('automated_email_id')
            .del();
        await nullableMigration.down(config);
    }
};
