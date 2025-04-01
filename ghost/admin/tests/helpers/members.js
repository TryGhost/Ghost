function toggleMembers(server, enabled) {
    const members_signup_access = enabled ? 'all' : 'none';
    const members_enabled = enabled;

    server.db.settings.findBy({key: 'members_signup_access'})
        ? server.db.settings.update({key: 'members_signup_access'}, {value: members_signup_access})
        : server.create('setting', {key: 'members_signup_access', value: members_signup_access, group: 'members'});

    server.db.settings.findBy({key: 'members_enabled'})
        ? server.db.settings.update({key: 'members_enabled'}, {value: members_enabled})
        : server.create('setting', {key: 'members_enabled', value: members_enabled, group: 'members'});
}

export function enableMembers(server) {
    toggleMembers(server, true);
}

export function disableMembers(server) {
    toggleMembers(server, false);
}

function togglePaidMembers(server, enabled) {
    server.db.settings.findBy({key: 'paid_members_enabled'})
        ? server.db.settings.update({key: 'paid_members_enabled'}, {value: enabled})
        : server.create('setting', {key: 'paid_members_enabled', value: enabled, group: 'members'});
}

export function enablePaidMembers(server) {
    togglePaidMembers(server, true);
}

export function disablePaidMembers(server) {
    togglePaidMembers(server, false);
}
