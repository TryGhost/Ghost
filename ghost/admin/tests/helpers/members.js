export function enableMembers(server, membersEnabled = true) {
    const membersSignupAccess = membersEnabled ? 'all' : 'none';

    server.db.settings.find({key: 'members_signup_access'})
        ? server.db.settings.update({key: 'members_signup_access'}, {value: membersSignupAccess})
        : server.create('setting', {key: 'members_signup_access', value: membersSignupAccess, group: 'members'});

    server.db.settings.find({key: 'members_enabled'})
        ? server.db.settings.update({key: 'members_enabled'}, {value: membersEnabled})
        : server.create('setting', {key: 'members_enabled', value: membersEnabled, group: 'members'});
}

export function disableMembers(server) {
    enableMembers(server, false);
}

export function enablePaidMembers(server, enabled = true) {
    server.db.settings.find({key: 'paid_members_enabled'})
        ? server.db.settings.update({key: 'paid_members_enabled'}, {value: enabled})
        : server.create('setting', {key: 'paid_members_enabled', value: enabled, group: 'members'});
}

export function disablePaidMembers(server) {
    enablePaidMembers(server, false);
}
