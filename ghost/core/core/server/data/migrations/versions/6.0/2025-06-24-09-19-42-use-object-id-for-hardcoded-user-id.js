const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;

const {createTransactionalMigration} = require('../../utils');

const LEGACY_HARDCODED_USER_ID = '1';

module.exports = createTransactionalMigration(
    async function up(knex) {
        const newId = (new ObjectID()).toHexString();

        logging.info(`Updating hardcoded user ID ${LEGACY_HARDCODED_USER_ID} to ${newId}`);

        const currentUserWithHardcodedId = await knex('users').where('id', LEGACY_HARDCODED_USER_ID).first();

        if (!currentUserWithHardcodedId) {
            logging.warn(`User with ID ${LEGACY_HARDCODED_USER_ID} not found, skipping migration`);

            return;
        }

        const now = Date.now();
        const email = currentUserWithHardcodedId.email;
        const slug = currentUserWithHardcodedId.slug;
        const temporaryEmail = `migrating-${now}@migration.local`;
        const temporarySlug = `migrating-${now}`;

        // Step 1: Create a clone of the current user using the new ID.
        // This is so we can assign existing references to the new user ID
        // without violating foreign key constraints. We also need to use a
        // temporary email and slug to avoid duplicate constraint errors
        const clonedUser = {
            ...currentUserWithHardcodedId,
            id: newId,
            slug: temporarySlug,
            email: temporaryEmail
        };

        await knex('users').insert(clonedUser);

        logging.info(`Cloned existing user with updated properties - ID: ${newId}, email: ${temporaryEmail}, slug: ${temporarySlug}`);

        // Step 2: Update all references to the current user ID to point
        // to the cloned user ID. The order matters to avoid foreign key
        // constraint violations.

        // 1. Tables with user_id column
        await knex('roles_users').where('user_id', LEGACY_HARDCODED_USER_ID).update({user_id: newId});
        await knex('permissions_users').where('user_id', LEGACY_HARDCODED_USER_ID).update({user_id: newId});
        await knex('sessions').where('user_id', LEGACY_HARDCODED_USER_ID).update({user_id: newId});
        await knex('api_keys').where('user_id', LEGACY_HARDCODED_USER_ID).update({user_id: newId});

        // 2. Tables with author_id column
        await knex('posts_authors').where('author_id', LEGACY_HARDCODED_USER_ID).update({author_id: newId});
        await knex('post_revisions').where('author_id', LEGACY_HARDCODED_USER_ID).update({author_id: newId});

        // 3. Tables with published_by column (nullable)
        await knex('posts').where('published_by', LEGACY_HARDCODED_USER_ID).update({published_by: newId});

        // 4. Actions table with actor_id
        await knex('actions')
            .where('actor_id', LEGACY_HARDCODED_USER_ID)
            .where('actor_type', 'user')
            .update({actor_id: newId});

        // 5. Update user_id inside session_data JSON
        await knex.raw(`
            UPDATE sessions
            SET session_data = JSON_SET(session_data, '$.user_id', ?)
            WHERE JSON_VALID(session_data)
            AND JSON_EXTRACT(session_data, '$.user_id') = ?
        `, [newId, LEGACY_HARDCODED_USER_ID]);

        // Step 3: Clean up the now redundant user record identified by the
        // legacy user ID as there should be no references to it anymore
        await knex('users').where('id', LEGACY_HARDCODED_USER_ID).del();

        logging.info(`Removed user with ID ${LEGACY_HARDCODED_USER_ID}`);

        // Step 4: Restore the original slug and email on the cloned user record
        await knex('users').where('id', newId).update({
            slug,
            email
        });

        logging.info(`Restored user slug and email: ${slug}, ${email}`);

        logging.info(`Successfully updated user ID from ${LEGACY_HARDCODED_USER_ID} to ${newId}`);
    },

    async function down() {
        // Major version migrations are not reversible
        logging.warn('Reverting migration of user ID to ObjectID is not supported');
    }
);
