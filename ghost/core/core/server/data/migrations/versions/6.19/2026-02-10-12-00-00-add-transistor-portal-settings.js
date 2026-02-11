const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'transistor_portal_settings',
    value: JSON.stringify({
        enabled: true,
        heading: 'Podcasts',
        description: 'Access your RSS feeds',
        button_text: 'Manage',
        url_template: 'https://partner.transistor.fm/ghost/{memberUuid}'
    }),
    type: 'object',
    group: 'transistor',
    flags: 'PUBLIC'
});
