export function enableStripe(server) {
    server.db.settings.find({key: 'stripe_connect_account_id'})
        ? server.db.settings.update({key: 'stripe_connect_account_id'}, {value: 'stripe_account_id'})
        : server.create('setting', {key: 'stripe_connect_account_id', value: 'stripe_account_id', group: 'members'});
    // needed for membersUtils.isStripeEnabled
    server.db.settings.find({key: 'stripe_connect_secret_key'})
        ? server.db.settings.update({key: 'stripe_connect_secret_key'}, {value: 'stripe_secret_key'})
        : server.create('setting', {key: 'stripe_connect_secret_key', value: 'stripe_secret_key', group: 'members'});
    server.db.settings.find({key: 'stripe_connect_publishable_key'})
        ? server.db.settings.update({key: 'stripe_connect_publishable_key'}, {value: 'stripe_secret_key'})
        : server.create('setting', {key: 'stripe_connect_publishable_key', value: 'stripe_secret_key', group: 'members'});

    server.db.settings.find({key: 'paid_members_enabled'})
        ? server.db.settings.update({key: 'paid_members_enabled'}, {value: true})
        : server.create('setting', {key: 'paid_members_enabled', value: true, group: 'members'});
}
