const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;
const {commands} = require('../../../schema');
const {createNonTransactionalMigration} = require('../../utils');

const ROLES = ['Editor', 'Administrator', 'Owner'];

const mediaFoldersSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    created_by: {type: 'string', maxlength: 24, nullable: true, references: 'users.id', setNullDelete: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
};

const folderIdSpec = {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'media_folders.id',
    setNullDelete: true
};

async function addTable(connection, tableName, spec) {
    const exists = await connection.schema.hasTable(tableName);
    if (exists) {
        logging.warn(`Skipping adding table: ${tableName} - table already exists`);
        return;
    }

    logging.info(`Adding table: ${tableName}`);
    await commands.createTable(tableName, connection, spec);
}

async function dropTable(connection, tableName) {
    const exists = await connection.schema.hasTable(tableName);
    if (!exists) {
        logging.warn(`Skipping dropping table: ${tableName} - table does not exist`);
        return;
    }

    logging.info(`Dropping table: ${tableName}`);
    await commands.deleteTable(tableName, connection);
}

async function addFolderId(connection) {
    const hasColumn = await connection.schema.hasColumn('media_files', 'folder_id');
    if (hasColumn) {
        logging.warn('Skipping adding column: media_files.folder_id - column already exists');
        return;
    }

    logging.info('Adding column: media_files.folder_id');
    await commands.addColumn('media_files', 'folder_id', connection, folderIdSpec);
    await commands.addIndex('media_files', 'folder_id', connection);
}

async function dropFolderId(connection) {
    const hasColumn = await connection.schema.hasColumn('media_files', 'folder_id');
    if (!hasColumn) {
        logging.warn('Skipping dropping column: media_files.folder_id - column does not exist');
        return;
    }

    logging.info('Dropping column: media_files.folder_id');
    await commands.dropColumn('media_files', 'folder_id', connection, folderIdSpec);
}

async function addPermission(connection, name, action) {
    const existingPermission = await connection('permissions').where({
        name,
        action_type: action,
        object_type: 'media'
    }).first();

    if (existingPermission) {
        logging.warn(`Permission ${name} already exists`);
        return existingPermission.id;
    }

    const id = ObjectId().toHexString();
    const date = connection.raw('CURRENT_TIMESTAMP');
    logging.info(`Adding permission ${name}`);
    await connection('permissions').insert({
        id,
        name,
        action_type: action,
        object_type: 'media',
        created_at: date,
        updated_at: date
    });

    return id;
}

async function addPermissionToRoles(connection, permissionId, permissionName) {
    await ROLES.reduce(async (previousRole, roleName) => {
        await previousRole;

        const role = await connection('roles').where({name: roleName}).first();
        if (!role) {
            logging.warn(`Skipping ${permissionName} role link - role ${roleName} does not exist`);
            return;
        }

        const existingRelation = await connection('permissions_roles').where({
            permission_id: permissionId,
            role_id: role.id
        }).first();

        if (existingRelation) {
            logging.warn(`Permission ${permissionName} already linked to role ${roleName}`);
            return;
        }

        logging.info(`Linking permission ${permissionName} to role ${roleName}`);
        await connection('permissions_roles').insert({
            id: ObjectId().toHexString(),
            permission_id: permissionId,
            role_id: role.id
        });
    }, Promise.resolve());
}

async function removePermission(connection, name, action) {
    const permission = await connection('permissions').where({
        name,
        action_type: action,
        object_type: 'media'
    }).first();

    if (!permission) {
        logging.warn(`Permission ${name} already removed`);
        return;
    }

    logging.info(`Removing permission ${name}`);
    await connection('permissions_roles').where({permission_id: permission.id}).del();
    await connection('permissions').where({id: permission.id}).del();
}

module.exports = createNonTransactionalMigration(
    async function up(connection) {
        await addTable(connection, 'media_folders', mediaFoldersSpec);
        await addFolderId(connection);

        const editPermissionId = await addPermission(connection, 'Edit media', 'edit');
        await addPermissionToRoles(connection, editPermissionId, 'Edit media');
    },
    async function down(connection) {
        await removePermission(connection, 'Edit media', 'edit');
        await dropFolderId(connection);
        await dropTable(connection, 'media_folders');
    }
);
