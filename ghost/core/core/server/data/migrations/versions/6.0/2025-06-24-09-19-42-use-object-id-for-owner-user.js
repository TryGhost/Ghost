const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;

const {createTransactionalMigration} = require('../../utils');

const LEGACY_OWNER_USER_ID = '1';

module.exports = createTransactionalMigration(
    async function up(knex) {
        const newId = (new ObjectID()).toHexString();

        logging.info(`Updating owner user ID from "${LEGACY_OWNER_USER_ID}" to "${newId}"`);

        const currentOwnerUser = await knex('users').where('id', LEGACY_OWNER_USER_ID).first();

        if (!currentOwnerUser) {
            logging.info(`Owner user with ID "${LEGACY_OWNER_USER_ID}" not found, skipping migration`);
            return;
        }

        const email = currentOwnerUser.email;
        const slug = currentOwnerUser.slug;
        const temporaryEmail = `migrating-${newId}`;
        const temporarySlug = `migrating-${newId}`;

        // Step 1: Create a clone of the current owner user using the new ID.
        // This is so we can assign existing references to the new owner user ID
        // without violating foreign key constraints. We also need to use a
        // temporary email and slug to avoid duplicate constraint errors
        const clonedOwnerUser = {
            ...currentOwnerUser,
            id: newId,
            slug: temporarySlug,
            email: temporaryEmail
        };

        await knex('users').insert(clonedOwnerUser);

        logging.info(`Cloned existing owner user with updated properties - ID: ${newId}, email: ${temporaryEmail}, slug: ${temporarySlug}`);

        // Step 2: Update all references to the current owner user ID to point
        // to the cloned owner user ID. The order matters to avoid foreign key
        // constraint violations.

        // 1. Tables with user_id column
        await knex('roles_users').where('user_id', LEGACY_OWNER_USER_ID).update({user_id: newId});
        await knex('permissions_users').where('user_id', LEGACY_OWNER_USER_ID).update({user_id: newId});
        await knex('sessions').where('user_id', LEGACY_OWNER_USER_ID).update({user_id: newId});
        await knex('api_keys').where('user_id', LEGACY_OWNER_USER_ID).update({user_id: newId});

        // 2. Tables with author_id column
        await knex('posts_authors').where('author_id', LEGACY_OWNER_USER_ID).update({author_id: newId});
        await knex('post_revisions').where('author_id', LEGACY_OWNER_USER_ID).update({author_id: newId});

        // 3. Tables with published_by column (nullable)
        await knex('posts').where('published_by', LEGACY_OWNER_USER_ID).update({published_by: newId});

        // 4. Actions table with actor_id
        await knex('actions')
            .where('actor_id', LEGACY_OWNER_USER_ID)
            .where('actor_type', 'user')
            .update({actor_id: newId});

        // Step 3: Clean up the now redundant user record identified by the
        // legacy owner user ID as there should be no references to it anymore
        await knex('users').where('id', LEGACY_OWNER_USER_ID).del();

        logging.info(`Removed user with ID: ${LEGACY_OWNER_USER_ID}`);

        // Step 4: Restore the original slug and email on the cloned owner user
        // record
        await knex('users').where('id', newId).update({
            slug,
            email
        });

        logging.info(`Restored owner user slug and email: ${slug}, ${email}`);

        logging.info(`Successfully updated owner user ID from ${LEGACY_OWNER_USER_ID} to ${newId}`);
    },

    async function down(knex) {
        logging.info(`Rolling back owner user ID migration - converting back to legacy ID "${LEGACY_OWNER_USER_ID}"`);

        // Find the current owner user by querying the roles table
        const ownerRole = await knex('roles').where('name', 'Owner').first();

        if (!ownerRole) {
            logging.warn('Owner role not found, skipping migration');

            return;
        }

        const ownerRoleUser = await knex('roles_users').where('role_id', ownerRole.id).first();

        if (!ownerRoleUser) {
            logging.warn('No user assigned to Owner role, skipping migration');

            return;
        }

        const currentOwnerUser = await knex('users').where('id', ownerRoleUser.user_id).first();

        if (!currentOwnerUser) {
            logging.warn('No owner user found to rollback, skipping migration');

            return;
        }

        const currentOwnerUserId = currentOwnerUser.id;
        const email = currentOwnerUser.email;
        const slug = currentOwnerUser.slug;
        const temporaryEmail = `rollback-${LEGACY_OWNER_USER_ID}`;
        const temporarySlug = `rollback-${LEGACY_OWNER_USER_ID}`;

        logging.info(`Found owner user with ID "${currentOwnerUserId}", rolling back to "${LEGACY_OWNER_USER_ID}"`);

        // Step 1: Create a clone of the current owner user using the legacy ID
        const clonedOwnerUser = {
            ...currentOwnerUser,
            id: LEGACY_OWNER_USER_ID,
            slug: temporarySlug,
            email: temporaryEmail
        };

        await knex('users').insert(clonedOwnerUser);

        logging.info(`Cloned owner user with legacy ID: ${LEGACY_OWNER_USER_ID}`);

        // Step 2: Update all references back to the legacy owner user ID
        // The order matters to avoid foreign key constraint violations

        // 1. Tables with user_id column
        await knex('roles_users').where('user_id', currentOwnerUserId).update({user_id: LEGACY_OWNER_USER_ID});
        await knex('permissions_users').where('user_id', currentOwnerUserId).update({user_id: LEGACY_OWNER_USER_ID});
        await knex('sessions').where('user_id', currentOwnerUserId).update({user_id: LEGACY_OWNER_USER_ID});
        await knex('api_keys').where('user_id', currentOwnerUserId).update({user_id: LEGACY_OWNER_USER_ID});

        // 2. Tables with author_id column
        await knex('posts_authors').where('author_id', currentOwnerUserId).update({author_id: LEGACY_OWNER_USER_ID});
        await knex('post_revisions').where('author_id', currentOwnerUserId).update({author_id: LEGACY_OWNER_USER_ID});

        // 3. Tables with published_by column (nullable)
        await knex('posts').where('published_by', currentOwnerUserId).update({published_by: LEGACY_OWNER_USER_ID});

        // 4. Actions table with actor_id
        await knex('actions')
            .where('actor_id', currentOwnerUserId)
            .where('actor_type', 'user')
            .update({actor_id: LEGACY_OWNER_USER_ID});

        // Step 3: Remove the ObjectID owner user record
        await knex('users').where('id', currentOwnerUserId).del();

        logging.info(`Removed user with ObjectID: ${currentOwnerUserId}`);

        // Step 4: Restore the original slug and email on the legacy owner user
        await knex('users').where('id', LEGACY_OWNER_USER_ID).update({
            slug,
            email
        });

        logging.info(`Restored owner user slug and email: ${slug}, ${email}`);

        logging.info(`Successfully rolled back owner user ID from ${currentOwnerUserId} to ${LEGACY_OWNER_USER_ID}`);
    }
);
