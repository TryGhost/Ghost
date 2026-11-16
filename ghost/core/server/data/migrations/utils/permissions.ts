import ObjectId from 'bson-objectid';
import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type { Knex } from 'knex';
import {
  createTransactionalMigration,
  combineTransactionalMigrations,
  type Migration,
} from './migrations';

const MIGRATION_USER = 1;

interface PermissionConfig {
  /** The name of the permission */
  name: string;
  /** The action_type of the permission */
  action: string;
  /** The object_type of the permission */
  object: string;
}

interface PermissionRoleConfig {
  /** The name of the permission */
  permission: string;
  /** The role to assign the permission to */
  role: string;
}

const messages = {
  permissionRoleActionError:
    'Cannot {action} permission({permission}) with role({role}) - {resource} does not exist',
};

async function addPermissionHelper(connection: Knex, config: PermissionConfig) {
  const existingPermission = await connection('permissions')
    .where({
      name: config.name,
      action_type: config.action,
      object_type: config.object,
    })
    .first();

  if (existingPermission) {
    logging.warn(`Permission for ${config.action}:${config.object} already added`);
    return;
  }

  logging.info(`Adding permission for ${config.action}:${config.object}`);

  const date = connection.raw('CURRENT_TIMESTAMP');

  const data: Record<string, unknown> = {
    id: ObjectId().toHexString(),
    name: config.name,
    action_type: config.action,
    object_type: config.object,
    created_at: date,
    updated_at: date,
  };

  if (await connection.schema.hasColumn('permissions', 'created_by')) {
    data.created_by = MIGRATION_USER;
  }

  if (await connection.schema.hasColumn('permissions', 'updated_by')) {
    data.updated_by = MIGRATION_USER;
  }

  await connection('permissions').insert(data);
}

async function removePermissionHelper(connection: Knex, config: PermissionConfig) {
  const existingPermission = await connection('permissions')
    .where({
      name: config.name,
      action_type: config.action,
      object_type: config.object,
    })
    .first();

  if (!existingPermission) {
    logging.warn(`Permission for ${config.action}:${config.object} already removed`);
    return;
  }

  logging.info(`Removing permission for ${config.action}:${config.object}`);

  await connection('permissions')
    .where({
      action_type: config.action,
      object_type: config.object,
    })
    .del();
}

/**
 * Creates a migration which will add a permission to the database
 */
export function addPermission(config: PermissionConfig): Migration {
  return createTransactionalMigration(
    async function up(connection) {
      await addPermissionHelper(connection, config);
    },
    async function down(connection) {
      await removePermissionHelper(connection, config);
    },
  );
}

/**
 * Creates a migration which will remove a permission from the database
 */
function removePermission(config: PermissionConfig): Migration {
  return createTransactionalMigration(
    async function up(connection) {
      await removePermissionHelper(connection, config);
    },
    async function down(connection) {
      await addPermissionHelper(connection, config);
    },
  );
}

async function addPermissionToRoleHelper(connection: Knex, config: PermissionRoleConfig) {
  const permission = await connection('permissions')
    .where({
      name: config.permission,
    })
    .first();

  // Permission checks no longer read these tables, and databases created
  // since fixtures stopped seeding permissions have no rows to link.
  if (!permission) {
    logging.warn(
      `Adding permission(${config.permission}) to role(${config.role}) - Permission not found.`,
    );
    return;
  }

  const role = await connection('roles')
    .where({
      name: config.role,
    })
    .first();

  if (!role) {
    throw new errors.InternalServerError({
      message: tpl(messages.permissionRoleActionError, {
        action: 'add',
        permission: config.permission,
        role: config.role,
        resource: 'role',
      }),
    });
  }

  const existingRelation = await connection('permissions_roles')
    .where({
      permission_id: permission.id,
      role_id: role.id,
    })
    .first();

  if (existingRelation) {
    logging.warn(
      `Adding permission(${config.permission}) to role(${config.role}) - already exists`,
    );
    return;
  }

  logging.info(`Adding permission(${config.permission}) to role(${config.role})`);
  await connection('permissions_roles').insert({
    id: ObjectId().toHexString(),
    permission_id: permission.id,
    role_id: role.id,
  });
}

async function removePermissionFromRoleHelper(connection: Knex, config: PermissionRoleConfig) {
  const permission = await connection('permissions')
    .where({
      name: config.permission,
    })
    .first();

  if (!permission) {
    logging.warn(
      `Removing permission(${config.permission}) from role(${config.role}) - Permission not found.`,
    );
    return;
  }

  const role = await connection('roles')
    .where({
      name: config.role,
    })
    .first();

  if (!role) {
    logging.warn(
      `Removing permission(${config.permission}) from role(${config.role}) - Role not found.`,
    );
    return;
  }

  const existingRelation = await connection('permissions_roles')
    .where({
      permission_id: permission.id,
      role_id: role.id,
    })
    .first();

  if (!existingRelation) {
    logging.warn(
      `Removing permission(${config.permission}) from role(${config.role}) - already removed`,
    );
    return;
  }

  logging.info(`Removing permission(${config.permission}) from role(${config.role})`);
  await connection('permissions_roles')
    .where({
      permission_id: permission.id,
      role_id: role.id,
    })
    .del();
}

/**
 * Creates a migration which will link a permission to a role in the database
 */
export function addPermissionToRole(config: PermissionRoleConfig): Migration {
  return createTransactionalMigration(
    async function up(connection) {
      await addPermissionToRoleHelper(connection, config);
    },
    async function down(connection) {
      await removePermissionFromRoleHelper(connection, config);
    },
  );
}

/**
 * Creates a migration which will remove the permission from roles
 */
export function removePermissionFromRole(config: PermissionRoleConfig): Migration {
  return createTransactionalMigration(
    async function up(connection) {
      await removePermissionFromRoleHelper(connection, config);
    },
    async function down(connection) {
      await addPermissionToRoleHelper(connection, config);
    },
  );
}

/**
 * Creates a migration which will add a permission to the database, and then link it to roles
 */
export function addPermissionWithRoles(config: PermissionConfig, roles: string[]): Migration {
  return combineTransactionalMigrations(
    addPermission(config),
    ...roles.map((role) => addPermissionToRole({ permission: config.name, role })),
  );
}

/**
 * Creates a migration which will remove permissions from roles, and then remove the permission
 */
export function createRemovePermissionMigration(
  config: PermissionConfig,
  roles: string[],
): Migration {
  return combineTransactionalMigrations(
    ...roles.map((role) => removePermissionFromRole({ permission: config.name, role })),
    removePermission(config),
  );
}
