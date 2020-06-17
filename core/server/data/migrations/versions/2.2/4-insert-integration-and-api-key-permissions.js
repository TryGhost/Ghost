const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse integrations',
        action: 'browse',
        object: 'integration'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Read integrations',
        action: 'read',
        object: 'integration'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Edit integrations',
        action: 'edit',
        object: 'integration'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Add integrations',
        action: 'add',
        object: 'integration'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Delete integrations',
        action: 'destroy',
        object: 'integration'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Browse API keys',
        action: 'browse',
        object: 'api_key'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Read API keys',
        action: 'read',
        object: 'api_key'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Edit API keys',
        action: 'edit',
        object: 'api_key'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Add API keys',
        action: 'add',
        object: 'api_key'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Delete API keys',
        action: 'destroy',
        object: 'api_key'
    }, [
        'Administrator'
    ])
);
