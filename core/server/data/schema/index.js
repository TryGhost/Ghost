var schema     = require('./schema'),
    checks     = require('./checks'),
    commands   = require('./commands'),
    versioning = require('./versioning'),
    defaultSettings = require('./default-settings');

module.exports.tables = schema;
module.exports.checks = checks;
module.exports.commands = commands;
module.exports.versioning = versioning;
module.exports.defaultSettings = defaultSettings;
