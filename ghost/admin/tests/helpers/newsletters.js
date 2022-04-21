export function enableNewsletters(server, enabled) {
    server.db.settings.find({key: 'editor_default_email_recipients'})
        ? server.db.settings.update({key: 'editor_default_email_recipients'}, {value: enabled ? 'visibility' : 'disabled'})
        : server.create('setting', {key: 'editor_default_email_recipients', value: enabled ? 'visibility' : 'disabled', group: 'editor'});
}
