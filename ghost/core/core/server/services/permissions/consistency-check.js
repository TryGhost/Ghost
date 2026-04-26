// Boot-time check that the static role map (role-permissions.js) agrees with
// the DB-loaded permissions for every role. Drift is silent privilege
// escalation waiting to happen — in CI/test we throw; in dev/prod we warn so
// a hot DB edit doesn't crash a running server.

const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const models = require('../../models');
const rolePermissions = require('./role-permissions');

async function loadDbPermissionsByRole() {
    const roles = await models.Role.findAll({withRelated: ['permissions']});
    const map = new Map();
    for (const role of roles.models) {
        const set = new Set();
        const perms = role.related('permissions');
        if (perms && perms.models) {
            for (const perm of perms.models) {
                set.add(`${perm.get('action_type')}:${perm.get('object_type')}`);
            }
        }
        map.set(role.get('name'), set);
    }
    return map;
}

function diffRolePermissions(dbPermissionsByRole) {
    const issues = [];
    for (const roleName of rolePermissions.listAllRoles()) {
        if (rolePermissions.ROLES_WITH_FULL_ACCESS.has(roleName)) {
            // Owner: short-circuited at runtime; not in the static map; not
            // expected to have DB permission rows assigned. Skip.
            continue;
        }
        const staticSet = rolePermissions.getPermissionsForRole(roleName);
        const dbSet = dbPermissionsByRole.get(roleName) || new Set();
        for (const key of staticSet) {
            if (!dbSet.has(key)) {
                issues.push(`role "${roleName}" static-only permission: ${key}`);
            }
        }
        for (const key of dbSet) {
            if (!staticSet.has(key)) {
                issues.push(`role "${roleName}" db-only permission: ${key}`);
            }
        }
    }
    return issues;
}

async function consistencyCheck() {
    const dbPermissionsByRole = await loadDbPermissionsByRole();
    const issues = diffRolePermissions(dbPermissionsByRole);
    if (issues.length === 0) {
        return;
    }
    const summary = `permissions: static role map drifted from DB (${issues.length} mismatch${issues.length === 1 ? '' : 'es'}):\n  - ${issues.slice(0, 20).join('\n  - ')}${issues.length > 20 ? `\n  - ...and ${issues.length - 20} more` : ''}`;
    if (process.env.NODE_ENV === 'testing' || process.env.CI === 'true') {
        throw new errors.IncorrectUsageError({message: summary});
    }
    logging.warn(summary);
}

module.exports = {consistencyCheck, diffRolePermissions};
