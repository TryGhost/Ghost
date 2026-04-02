const logging = require('@tryghost/logging');
const {commands} = require('../../../schema');
const {createNonTransactionalMigration} = require('../../utils');
const ObjectId = require('bson-objectid').default;

const WELCOME_EMAIL_AUTOMATED_EMAILS_AUTOMATION_FK = 'weae_automation_id_foreign';
const WELCOME_EMAIL_AUTOMATIONS_FIRST_EMAIL_FK = 'wea_first_email_id_foreign';

// Created without the FK on first_welcome_email_automated_email_id to break the
// circular reference. The FK is added after data population.
const welcomeEmailAutomationsSpecWithoutFK = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'inactive', validations: {isIn: [['active', 'inactive']]}},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    first_welcome_email_automated_email_id: {type: 'string', maxlength: 24, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
};

const welcomeEmailAutomatedEmailsSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    welcome_email_automation_id: {type: 'string', maxlength: 24, nullable: false, references: 'welcome_email_automations.id', constraintName: WELCOME_EMAIL_AUTOMATED_EMAILS_AUTOMATION_FK, cascadeDelete: true},
    subject: {type: 'string', maxlength: 300, nullable: false},
    lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    sender_name: {type: 'string', maxlength: 191, nullable: true},
    sender_email: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    email_design_setting_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_design_settings.id'},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
};

const oldAutomatedEmailsSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'inactive', validations: {isIn: [['active', 'inactive']]}},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    subject: {type: 'string', maxlength: 300, nullable: false},
    lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    sender_name: {type: 'string', maxlength: 191, nullable: true},
    sender_email: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    email_design_setting_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_design_settings.id'},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['slug'],
        ['status']
    ]
};

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        // 1. Create welcome_email_automations table (without FK to emails, to break circular reference)
        const automationsExists = await knex.schema.hasTable('welcome_email_automations');
        if (automationsExists) {
            logging.warn('Skipping creating table welcome_email_automations - already exists');
        } else {
            logging.info('Creating table: welcome_email_automations');
            await commands.createTable('welcome_email_automations', knex, welcomeEmailAutomationsSpecWithoutFK);
        }

        // 2. Create welcome_email_automated_emails table (with FK + CASCADE to automations)
        const automatedEmailsExists = await knex.schema.hasTable('welcome_email_automated_emails');
        if (automatedEmailsExists) {
            logging.warn('Skipping creating table welcome_email_automated_emails - already exists');
        } else {
            logging.info('Creating table: welcome_email_automated_emails');
            await commands.createTable('welcome_email_automated_emails', knex, welcomeEmailAutomatedEmailsSpec);
        }

        // 3. Copy data from automated_emails into both new tables
        const oldTableExists = await knex.schema.hasTable('automated_emails');
        if (!oldTableExists) {
            logging.warn('Skipping data migration - automated_emails table does not exist');
        } else {
            const rows = await knex('automated_emails').select('*');
            logging.info(`Migrating ${rows.length} rows from automated_emails to new tables`);

            // Only 2 rows exist (free + paid welcome emails), so sequential iteration is fine
            // eslint-disable-next-line no-restricted-syntax
            for (const row of rows) {
                const automationId = ObjectId().toHexString();

                // Check if already migrated (idempotency)
                const existingAutomation = await knex('welcome_email_automations').where('first_welcome_email_automated_email_id', row.id).first();
                if (!existingAutomation) {
                    // Insert automation first (emails reference automations via FK)
                    await knex('welcome_email_automations').insert({
                        id: automationId,
                        status: row.status,
                        name: row.name,
                        slug: row.slug,
                        created_at: row.created_at,
                        updated_at: row.updated_at
                    });

                    await knex('welcome_email_automated_emails').insert({
                        id: row.id,
                        welcome_email_automation_id: automationId,
                        subject: row.subject,
                        lexical: row.lexical,
                        sender_name: row.sender_name,
                        sender_email: row.sender_email,
                        sender_reply_to: row.sender_reply_to,
                        email_design_setting_id: row.email_design_setting_id,
                        created_at: row.created_at,
                        updated_at: row.updated_at
                    });

                    // Set back-reference from automation to its first email
                    await knex('welcome_email_automations')
                        .where('id', automationId)
                        .update({first_welcome_email_automated_email_id: row.id});
                } else {
                    logging.warn(`Skipping row for email ${row.id} - already migrated`);
                }
            }

            // 4. Add FK from automations.first_welcome_email_automated_email_id -> emails.id
            logging.info('Adding foreign key from welcome_email_automations to welcome_email_automated_emails');
            await commands.addForeign({
                fromTable: 'welcome_email_automations',
                fromColumn: 'first_welcome_email_automated_email_id',
                toTable: 'welcome_email_automated_emails',
                toColumn: 'id',
                constraintName: WELCOME_EMAIL_AUTOMATIONS_FIRST_EMAIL_FK,
                transaction: knex
            });

            // 5. Drop FK on automated_email_recipients -> automated_emails
            logging.info('Updating foreign key on automated_email_recipients');
            await commands.dropForeign({
                fromTable: 'automated_email_recipients',
                fromColumn: 'automated_email_id',
                toTable: 'automated_emails',
                toColumn: 'id',
                transaction: knex
            });

            // 6. Add FK on automated_email_recipients -> welcome_email_automated_emails
            await commands.addForeign({
                fromTable: 'automated_email_recipients',
                fromColumn: 'automated_email_id',
                toTable: 'welcome_email_automated_emails',
                toColumn: 'id',
                transaction: knex
            });

            // 7. Drop the automated_emails table
            logging.info('Dropping table: automated_emails');
            await commands.deleteTable('automated_emails', knex);
        }
    },

    async function down(knex) {
        // 1. Recreate automated_emails table
        const oldTableExists = await knex.schema.hasTable('automated_emails');
        if (oldTableExists) {
            logging.warn('Skipping creating table automated_emails - already exists');
        } else {
            logging.info('Recreating table: automated_emails');
            await commands.createTable('automated_emails', knex, oldAutomatedEmailsSpec);
        }

        // 2. Copy data back from new tables to automated_emails
        const automationsExists = await knex.schema.hasTable('welcome_email_automations');
        const automatedEmailsTableExists = await knex.schema.hasTable('welcome_email_automated_emails');

        if (automationsExists && automatedEmailsTableExists) {
            const rows = await knex('welcome_email_automations')
                .join(
                    'welcome_email_automated_emails',
                    'welcome_email_automations.first_welcome_email_automated_email_id',
                    'welcome_email_automated_emails.id'
                )
                .select(
                    'welcome_email_automations.id as automation_id',
                    'welcome_email_automations.status',
                    'welcome_email_automations.name',
                    'welcome_email_automations.slug',
                    'welcome_email_automations.created_at',
                    'welcome_email_automations.updated_at',
                    'welcome_email_automated_emails.id as email_id',
                    'welcome_email_automated_emails.subject',
                    'welcome_email_automated_emails.lexical',
                    'welcome_email_automated_emails.sender_name',
                    'welcome_email_automated_emails.sender_email',
                    'welcome_email_automated_emails.sender_reply_to',
                    'welcome_email_automated_emails.email_design_setting_id'
                );
            logging.info(`Migrating ${rows.length} rows back to automated_emails`);

            // Only 2 rows exist (free + paid welcome emails), so sequential iteration is fine
            // eslint-disable-next-line no-restricted-syntax
            for (const row of rows) {
                const existing = await knex('automated_emails').where('id', row.email_id).first();
                if (!existing) {
                    await knex('automated_emails').insert({
                        id: row.email_id,
                        status: row.status,
                        name: row.name,
                        slug: row.slug,
                        subject: row.subject,
                        lexical: row.lexical,
                        sender_name: row.sender_name,
                        sender_email: row.sender_email,
                        sender_reply_to: row.sender_reply_to,
                        email_design_setting_id: row.email_design_setting_id,
                        created_at: row.created_at,
                        updated_at: row.updated_at
                    });
                } else {
                    logging.warn(`Skipping automated_emails row ${row.email_id} - already exists`);
                }
            }

            // 3. Update FK on automated_email_recipients
            logging.info('Restoring foreign key on automated_email_recipients');
            await commands.dropForeign({
                fromTable: 'automated_email_recipients',
                fromColumn: 'automated_email_id',
                toTable: 'welcome_email_automated_emails',
                toColumn: 'id',
                transaction: knex
            });

            await commands.addForeign({
                fromTable: 'automated_email_recipients',
                fromColumn: 'automated_email_id',
                toTable: 'automated_emails',
                toColumn: 'id',
                transaction: knex
            });
        } else {
            logging.warn('Skipping data migration - new tables do not exist');
        }

        // 4. Drop FK from welcome_email_automations before deleting referenced table
        logging.info('Dropping foreign key from welcome_email_automations to welcome_email_automated_emails');
        await commands.dropForeign({
            fromTable: 'welcome_email_automations',
            fromColumn: 'first_welcome_email_automated_email_id',
            toTable: 'welcome_email_automated_emails',
            toColumn: 'id',
            constraintName: WELCOME_EMAIL_AUTOMATIONS_FIRST_EMAIL_FK,
            transaction: knex
        });

        // 5. Drop new tables after removing dependent FK
        logging.info('Dropping table: welcome_email_automated_emails');
        await commands.deleteTable('welcome_email_automated_emails', knex);
        logging.info('Dropping table: welcome_email_automations');
        await commands.deleteTable('welcome_email_automations', knex);
    }
);
