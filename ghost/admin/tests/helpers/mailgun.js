export function enableMailgun(server) {
    server.db.settings.find({key: 'mailgun_api_key'})
        ? server.db.settings.update({key: 'mailgun_api_key'}, {value: 'MAILGUN_API_KEY'})
        : server.create('setting', {key: 'mailgun_api_key', value: 'MAILGUN_API_KEY', group: 'email'});

    server.db.settings.find({key: 'mailgun_domain'})
        ? server.db.settings.update({key: 'mailgun_domain'}, {value: 'MAILGUN_DOMAIN'})
        : server.create('setting', {key: 'mailgun_domain', value: 'MAILGUN_DOMAIN', group: 'email'});

    server.db.settings.find({key: 'mailgun_base_url'})
        ? server.db.settings.update({key: 'mailgun_base_url'}, {value: 'MAILGUN_BASE_URL'})
        : server.create('setting', {key: 'mailgun_base_url', value: 'MAILGUN_BASE_URL', group: 'email'});
}
