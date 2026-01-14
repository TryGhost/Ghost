export function enableNewsletters(server, enabled = true) {
    server.db.settings.findBy({key: 'editor_default_email_recipients'})
        ? server.db.settings.update({key: 'editor_default_email_recipients'}, {value: (enabled ? 'visibility' : 'disabled')})
        : server.create('setting', {key: 'editor_default_email_recipients', value: (enabled ? 'visibility' : 'disabled'), group: 'editor'});
}

export function disableNewsletters(server) {
    enableNewsletters(server, false);
}
