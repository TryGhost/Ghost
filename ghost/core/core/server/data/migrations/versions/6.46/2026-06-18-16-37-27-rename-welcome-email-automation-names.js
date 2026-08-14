const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const AUTOMATION_NAME_UPDATES = [
    {
        slug: 'member-welcome-email-free',
        upName: 'Free member welcome flow',
        downName: 'Welcome Email (Free)'
    },
    {
        slug: 'member-welcome-email-paid',
        upName: 'Paid member welcome flow',
        downName: 'Welcome Email (Paid)'
    }
];

async function renameAutomations(knex, direction) {
    // There are only two of these, so it's fine to use a `for` loop.
    // eslint-disable-next-line no-restricted-syntax
    for (const {slug, upName, downName} of AUTOMATION_NAME_UPDATES) {
        const name = direction === 'up' ? upName : downName;
        const updatedRows = await knex('automations')
            .where({slug})
            .update({name});

        if (updatedRows === 0) {
            logging.info(`No automation found for slug "${slug}", leaving name unchanged`);
            continue;
        }

        logging.info(`Renamed automation "${slug}" to "${name}"`);
    }
}

module.exports = createTransactionalMigration(
    async function up(knex) {
        await renameAutomations(knex, 'up');
    },

    async function down(knex) {
        await renameAutomations(knex, 'down');
    }
);
