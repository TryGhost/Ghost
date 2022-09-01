const {dropTables} = require('../../utils');

const tables = [
    'permissions_apps',
    'app_fields',
    'app_settings',
    'apps'
];

module.exports = dropTables(tables);
