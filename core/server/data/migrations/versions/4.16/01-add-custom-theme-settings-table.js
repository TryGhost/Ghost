const utils = require('../../utils');

module.exports = utils.addTable('custom_theme_settings', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    theme: {type: 'string', maxlength: 191, nullable: false},
    key: {type: 'string', maxlength: 191, nullable: false},
    type: {type: 'string', maxlength: 50, nullable: false},
    value: {type: 'text', maxlength: 65535, nullable: true}
});
