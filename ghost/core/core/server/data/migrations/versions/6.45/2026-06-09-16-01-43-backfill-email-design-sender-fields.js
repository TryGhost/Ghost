const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const designTable = 'email_design_settings';
const welcomeEmailTable = 'welcome_email_automated_emails';
const automationsTable = 'automations';
const senderFields = ['sender_name', 'sender_email', 'sender_reply_to'];
const freeSlug = 'member-welcome-email';
const paidSlug = 'member-welcome-email-paid';

function normalize(value) {
    if (typeof value !== 'string') {
        return value || null;
    }

    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function getValueForSlug(rows, slug, field) {
    const row = rows.find(candidate => candidate.slug === slug);
    return row ? normalize(row[field]) : null;
}

function resolveFieldValue({designId, field, rows}) {
    const freeValue = getValueForSlug(rows, freeSlug, field);
    const paidValue = getValueForSlug(rows, paidSlug, field);
    const nonEmptyValues = rows
        .map(row => normalize(row[field]))
        .filter(Boolean);
    const uniqueValues = [...new Set(nonEmptyValues)];

    if (uniqueValues.length === 0) {
        logging.info(`Backfilling ${designTable}.${field} for ${designId}: no non-empty welcome email values found`);
        return null;
    }

    if (uniqueValues.length === 1) {
        logging.info(`Backfilling ${designTable}.${field} for ${designId}: copied matching/non-conflicting value`);
        return uniqueValues[0];
    }

    const chosenValue = freeValue || paidValue || uniqueValues[0];
    logging.warn(`Backfilling ${designTable}.${field} for ${designId}: conflicting non-empty welcome email values found; using ${freeValue ? 'free welcome email' : paidValue ? 'paid welcome email' : 'first available'} value`);
    return chosenValue;
}

module.exports = createTransactionalMigration(
    async function up(knex) {
        const hasDesignTable = await knex.schema.hasTable(designTable);
        if (!hasDesignTable) {
            logging.warn(`Skipping sender backfill - ${designTable} table does not exist`);
            return;
        }

        const hasWelcomeEmailTable = await knex.schema.hasTable(welcomeEmailTable);
        if (!hasWelcomeEmailTable) {
            logging.warn(`Skipping sender backfill - ${welcomeEmailTable} table does not exist`);
            return;
        }

        const hasAutomationsTable = await knex.schema.hasTable(automationsTable);
        if (!hasAutomationsTable) {
            logging.warn(`Skipping sender backfill - ${automationsTable} table does not exist`);
            return;
        }

        for (const field of senderFields) {
            const hasDesignColumn = await knex.schema.hasColumn(designTable, field);
            const hasWelcomeEmailColumn = await knex.schema.hasColumn(welcomeEmailTable, field);

            if (!hasDesignColumn || !hasWelcomeEmailColumn) {
                logging.warn(`Skipping sender backfill - missing ${hasDesignColumn ? welcomeEmailTable : designTable}.${field} column`);
                return;
            }
        }

        const rows = await knex(`${welcomeEmailTable} as email`)
            .leftJoin(`${automationsTable} as automation`, 'automation.id', 'email.welcome_email_automation_id')
            .select(
                'email.email_design_setting_id',
                'automation.slug',
                ...senderFields.map(field => `email.${field}`)
            )
            .whereNotNull('email.email_design_setting_id');

        if (rows.length === 0) {
            logging.info('Skipping sender backfill - no welcome email rows with design settings found');
            return;
        }

        const rowsByDesignId = new Map();
        for (const row of rows) {
            const designId = row.email_design_setting_id;
            rowsByDesignId.set(designId, [...(rowsByDesignId.get(designId) || []), row]);
        }

        logging.info(`Backfilling sender fields for ${rowsByDesignId.size} email design setting row(s)`);

        for (const [designId, designRows] of rowsByDesignId.entries()) {
            const attrs = {};
            for (const field of senderFields) {
                attrs[field] = resolveFieldValue({designId, field, rows: designRows});
            }

            const updated = await knex(designTable)
                .where('id', designId)
                .update(attrs);

            if (updated === 0) {
                logging.warn(`Backfilling sender fields for ${designId}: matching email design setting row not found`);
            } else {
                logging.info(`Backfilled sender fields for email design setting ${designId}`);
            }
        }
    },

    async function down() {
        logging.info('Skipping sender backfill rollback - existing welcome email sender fields are preserved by adjacent migrations');
    }
);
