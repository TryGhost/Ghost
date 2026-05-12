const ObjectId = require('bson-objectid').default;
const logging = require('@tryghost/logging');
const {commands} = require('../../../schema');
const {createNonTransactionalMigration} = require('../../utils');

const ROLES = ['Editor', 'Administrator', 'Owner'];

const mediaFilesSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    url: {type: 'string', maxlength: 2000, nullable: false},
    url_hash: {type: 'string', maxlength: 64, nullable: false, unique: true},
    storage_path: {type: 'string', maxlength: 2000, nullable: true},
    storage_type: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['images', 'files', 'media']]}},
    media_type: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['image', 'video', 'audio', 'file']]}},
    mime_type: {type: 'string', maxlength: 191, nullable: true},
    extension: {type: 'string', maxlength: 50, nullable: true},
    name: {type: 'string', maxlength: 191, nullable: false},
    size_bytes: {type: 'bigInteger', nullable: true, unsigned: true},
    width: {type: 'integer', nullable: true, unsigned: true},
    height: {type: 'integer', nullable: true, unsigned: true},
    thumbnail_url: {type: 'string', maxlength: 2000, nullable: true},
    source: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'upload', validations: {isIn: [['upload', 'external', 'unsplash', 'tenor']]}},
    created_by: {type: 'string', maxlength: 24, nullable: true, references: 'users.id', setNullDelete: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['storage_type'],
        ['media_type'],
        ['source'],
        ['created_at']
    ]
};

const mediaFileUsagesSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    media_file_id: {type: 'string', maxlength: 24, nullable: false, references: 'media_files.id', cascadeDelete: true},
    resource_type: {type: 'string', maxlength: 50, nullable: false},
    resource_id: {type: 'string', maxlength: 24, nullable: true},
    field: {type: 'string', maxlength: 191, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    '@@INDEXES@@': [
        ['media_file_id'],
        ['resource_type', 'resource_id']
    ]
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
        await addTable(connection, 'media_files', mediaFilesSpec);
        await addTable(connection, 'media_file_usages', mediaFileUsagesSpec);

        const browsePermissionId = await addPermission(connection, 'Browse media', 'browse');
        await addPermissionToRoles(connection, browsePermissionId, 'Browse media');

        const readPermissionId = await addPermission(connection, 'Read media', 'read');
        await addPermissionToRoles(connection, readPermissionId, 'Read media');
    },
    async function down(connection) {
        await removePermission(connection, 'Read media', 'read');
        await removePermission(connection, 'Browse media', 'browse');
        await dropTable(connection, 'media_file_usages');
        await dropTable(connection, 'media_files');
    }
);
