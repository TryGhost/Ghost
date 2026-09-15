const {combineTransactionalMigrations, createAddColumnMigration, createTransactionalMigration} = require('../../utils');

const addAtprotoDidToMembers = createAddColumnMigration('members', 'atproto_did', {
    type: 'string',
    maxlength: 191,
    nullable: true,
    unique: true
});

const addAtprotoOauthStatesTable = createTransactionalMigration(
    async function up(knex) {
        const exists = await knex.schema.hasTable('atproto_oauth_states');
        if (exists) {
            return;
        }
        await knex.schema.createTable('atproto_oauth_states', (t) => {
            t.string('id', 64).primary();
            t.string('pkce_verifier', 191).notNullable();
            t.text('dpop_private_key_jwk').notNullable();
            t.string('resolved_did', 2048).notNullable();
            t.string('pds_token_endpoint', 2048).notNullable();
            t.string('as_issuer', 2048).notNullable();
            t.string('redirect_url', 2048).nullable();
            t.boolean('email_required').notNullable().defaultTo(false);
            t.datetime('expires_at').notNullable();
        });
    },
    async function down(knex) {
        await knex.schema.dropTableIfExists('atproto_oauth_states');
    }
);

const addAtprotoPendingEmailTable = createTransactionalMigration(
    async function up(knex) {
        const exists = await knex.schema.hasTable('atproto_pending_email');
        if (exists) {
            return;
        }
        await knex.schema.createTable('atproto_pending_email', (t) => {
            t.string('id', 64).primary();
            t.string('verified_did', 2048).notNullable();
            t.datetime('expires_at').notNullable();
        });
    },
    async function down(knex) {
        await knex.schema.dropTableIfExists('atproto_pending_email');
    }
);

module.exports = combineTransactionalMigrations(
    addAtprotoDidToMembers,
    addAtprotoOauthStatesTable,
    addAtprotoPendingEmailTable
);
