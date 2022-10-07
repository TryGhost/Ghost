export function enableMembers(server) {
    server.db.settings.find({key: 'members_signup_access'})
        ? server.db.settings.update({key: 'members_signup_access'}, {value: 'all'})
        : server.create('setting', {key: 'members_signup_access', value: 'all', group: 'members'});

    server.db.settings.find({key: 'members_enabled'})
        ? server.db.settings.update({key: 'members_enabled'}, {value: true})
        : server.create('setting', {key: 'members_enabled', value: true, group: 'members'});
}

export function disableMembers(server) {
    server.db.settings.find({key: 'members_signup_access'})
        ? server.db.settings.update({key: 'members_signup_access'}, {value: 'none'})
        : server.create('setting', {key: 'members_signup_access', value: 'none', group: 'members'});
}

export function enablePaidMembers(server) {
    server.db.settings.find({key: 'paid_members_enabled'})
        ? server.db.settings.update({key: 'paid_members_enabled'}, {value: true})
        : server.create('setting', {key: 'paid_members_enabled', value: true, group: 'members'});
}
