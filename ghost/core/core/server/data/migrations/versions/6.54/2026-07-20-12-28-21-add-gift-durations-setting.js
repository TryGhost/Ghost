const ObjectId = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');
const MIGRATION_USER = 1;

// Gift durations an existing site starts with. New installs never run this
// (knex-migrator marks migrations complete on init) and get the
// default-settings.json default instead — every duration enabled. Existing
// sites start from what their Portal already offers: the monthly plan maps to
// the 1 month gift, the yearly plan to the 1 year gift — so upgrading doesn't
// silently start selling 3/6 month gifts nobody reviewed. Publishers can
// enable more durations afterwards in gift subscription settings.
module.exports = createTransactionalMigration(
    async function up(connection) {
        const settingExists = await connection('settings')
            .where('key', '=', 'gift_durations')
            .first();
        if (settingExists) {
            logging.warn('Skipping adding setting: gift_durations - setting already exists');
            return;
        }

        // Defensive: a missing or unparseable portal_plans falls back to both
        // plans enabled, which matches Portal's own default.
        let portalPlans = ['monthly', 'yearly'];
        const portalPlansRow = await connection('settings')
            .where('key', '=', 'portal_plans')
            .first();
        if (portalPlansRow?.value) {
            try {
                const parsed = JSON.parse(portalPlansRow.value);
                if (Array.isArray(parsed)) {
                    portalPlans = parsed;
                }
            } catch (err) {
                logging.warn('Could not parse portal_plans, defaulting gift durations to monthly and yearly');
            }
        } else {
            logging.warn('No portal_plans setting found, defaulting gift durations to monthly and yearly');
        }

        const durations = [];
        if (portalPlans.includes('monthly')) {
            durations.push(1);
        }
        if (portalPlans.includes('yearly')) {
            durations.push(12);
        }

        logging.info(`Adding setting: gift_durations = ${JSON.stringify(durations)} (from portal_plans)`);
        const now = connection.raw('CURRENT_TIMESTAMP');

        const data = {
            id: ObjectId().toHexString(),
            key: 'gift_durations',
            value: JSON.stringify(durations),
            group: 'gifts',
            type: 'array',
            flags: null,
            created_at: now
        };

        if (await connection.schema.hasColumn('settings', 'created_by')) {
            data.created_by = MIGRATION_USER;
        }

        if (await connection.schema.hasColumn('settings', 'updated_by')) {
            data.updated_by = MIGRATION_USER;
        }

        return connection('settings').insert(data);
    },
    async function down(connection) {
        const settingExists = await connection('settings')
            .where('key', '=', 'gift_durations')
            .first();
        if (!settingExists) {
            logging.warn('Skipping dropping setting: gift_durations - setting does not exist');
            return;
        }

        logging.info('Dropping setting: gift_durations');
        return connection('settings')
            .where('key', '=', 'gift_durations')
            .del();
    }
);
