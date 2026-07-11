const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'spacer_image_url_template',
    value: 'https://img.spacergif.org/v1/{width}x{height}/0a/spacer.png',
    type: 'string',
    group: 'editor'
});
