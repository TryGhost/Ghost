export function enableMembers(server) {
    server.db.settings.find({key: 'members_signup_access'})
        ? server.db.settings.update({key: 'members_signup_access'}, {value: 'all'})
        : server.create('setting', {key: 'members_signup_access', value: 'all', group: 'members'});
}

export function disableMembers(server) {
    server.db.settings.find({key: 'members_signup_access'})
        ? server.db.settings.update({key: 'members_signup_access'}, {value: 'none'})
        : server.create('setting', {key: 'members_signup_access', value: 'none', group: 'members'});
}
