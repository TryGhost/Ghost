const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const {addPermissionToRole, combineTransactionalMigrations, createTransactionalMigration} = require('../../utils');
const MIGRATION_USER = 1;

module.exports = combineTransactionalMigrations(
    // Remove the Super Editor role
    createTransactionalMigration(
        async function up(knex) {
            logging.info('Removing "Super Editor" role');
            const existingRole = await knex('roles').where({
                name: 'Super Editor'
            }).first();

            if (!existingRole) {
                logging.warn('"Super Editor" role does not exist, skipping removal');
                return;
            }

            // First convert any users with Super Editor role to regular Editors
            const usersWithSuperEditorRole = await knex('roles_users')
                .join('roles', 'roles_users.role_id', 'roles.id')
                .where('roles.name', 'Super Editor')
                .select('roles_users.user_id');

            if (usersWithSuperEditorRole.length > 0) {
                logging.info(`Found ${usersWithSuperEditorRole.length} users with Super Editor role, converting to Editors`);
                
                // Get the Editor role ID
                const editorRole = await knex('roles').where({
                    name: 'Editor'
                }).first();

                if (!editorRole) {
                    throw new errors.InternalServerError({
                        message: 'Editor role not found'
                    });
                }

                // Convert users with Super Editor role to regular Editors
                await Promise.all(usersWithSuperEditorRole.map(async (userRole) => {
                    // Check if user already has Editor role
                    const existingEditorRole = await knex('roles_users')
                        .join('roles', 'roles_users.role_id', 'roles.id')
                        .where({
                            'roles_users.user_id': userRole.user_id,
                            'roles.name': 'Editor'
                        })
                        .first();

                    if (!existingEditorRole) {
                        // Add Editor role to user
                        await knex('roles_users').insert({
                            id: require('bson-objectid').default().toHexString(),
                            user_id: userRole.user_id,
                            role_id: editorRole.id
                        });
                    }

                    // Remove Super Editor role from user
                    await knex('roles_users')
                        .join('roles', 'roles_users.role_id', 'roles.id')
                        .where({
                            'roles_users.user_id': userRole.user_id,
                            'roles.name': 'Super Editor'
                        })
                        .del();
                }));
            }

            // Remove the role
            await knex('roles').where({
                name: 'Super Editor'
            }).del();
        },
        async function down(knex) {
            logging.info('Recreating "Super Editor" role');
            const {default: ObjectID} = require('bson-objectid');
            
            // Recreate the Super Editor role
            const superEditorRoleId = (new ObjectID()).toHexString();
            await knex('roles').insert({
                id: superEditorRoleId,
                name: 'Super Editor',
                description: 'Editor plus member management',
                created_by: MIGRATION_USER,
                created_at: knex.raw('current_timestamp')
            });

            // Note: We don't automatically convert users back to Super Editor role
            // as we can't determine which Editors were originally Super Editors
            // This would need to be done manually if rollback is required
        }
    ),
    
    // Add member management permissions to Editors
    addPermissionToRole({
        permission: 'Browse Members',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Read Members',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Edit Members',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Add Members',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Delete Members',
        role: 'Editor'
    }),
    
    // Add offer permissions to Editors
    addPermissionToRole({
        permission: 'Read offers',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Browse offers',
        role: 'Editor'
    }),
    
    // Add member signin urls permission to Editors
    addPermissionToRole({
        permission: 'Read member signin urls',
        role: 'Editor'
    }),
    
    // Add comment management permissions to Editors
    addPermissionToRole({
        permission: 'Moderate comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Like comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Unlike comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Add comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Edit comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Delete comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Read comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Browse comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Report comments',
        role: 'Editor'
    })
);
