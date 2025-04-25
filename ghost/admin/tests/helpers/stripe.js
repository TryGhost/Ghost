export function enableStripe(server, enabled = true) {
    server.db.settings.findBy({key: 'stripe_connect_account_id'})
        ? server.db.settings.update({key: 'stripe_connect_account_id'}, {value: (enabled ? 'stripe_account_id' : null)})
        : server.create('setting', {key: 'stripe_connect_account_id', value: (enabled ? 'stripe_account_id' : null), group: 'members'});
    // needed for membersUtils.isStripeEnabled
    server.db.settings.findBy({key: 'stripe_connect_secret_key'})
        ? server.db.settings.update({key: 'stripe_connect_secret_key'}, {value: (enabled ? 'stripe_secret_key' : null)})
        : server.create('setting', {key: 'stripe_connect_secret_key', value: (enabled ? 'stripe_secret_key' : null), group: 'members'});
    server.db.settings.findBy({key: 'stripe_connect_publishable_key'})
        ? server.db.settings.update({key: 'stripe_connect_publishable_key'}, {value: (enabled ? 'stripe_secret_key' : null)})
        : server.create('setting', {key: 'stripe_connect_publishable_key', value: (enabled ? 'stripe_secret_key' : null), group: 'members'});

    server.db.settings.findBy({key: 'paid_members_enabled'})
        ? server.db.settings.update({key: 'paid_members_enabled'}, {value: enabled})
        : server.create('setting', {key: 'paid_members_enabled', value: enabled, group: 'members'});
}

export function disableStripe(server) {
    enableStripe(server, false);
}
