export function enableMailgun(server, enabled = true) {
    server.db.settings.findBy({key: 'mailgun_api_key'})
        ? server.db.settings.update({key: 'mailgun_api_key'}, {value: (enabled ? 'MAILGUN_API_KEY' : null)})
        : server.create('setting', {key: 'mailgun_api_key', value: (enabled ? 'MAILGUN_API_KEY' : null), group: 'email'});

    server.db.settings.findBy({key: 'mailgun_domain'})
        ? server.db.settings.update({key: 'mailgun_domain'}, {value: (enabled ? 'MAILGUN_DOMAIN' : null)})
        : server.create('setting', {key: 'mailgun_domain', value: (enabled ? 'MAILGUN_DOMAIN' : null), group: 'email'});

    server.db.settings.findBy({key: 'mailgun_base_url'})
        ? server.db.settings.update({key: 'mailgun_base_url'}, {value: (enabled ? 'MAILGUN_BASE_URL' : null)})
        : server.create('setting', {key: 'mailgun_base_url', value: (enabled ? 'MAILGUN_BASE_URL' : null), group: 'email'});
}

export function disableMailgun(server) {
    enableMailgun(server, false);
}
