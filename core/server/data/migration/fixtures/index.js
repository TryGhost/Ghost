var populate = require('./populate'),
    update   = require('./update'),
    fixtures = require('./fixtures'),
    settings = require('./settings');

module.exports = {
    populate: populate,
    update: update,
    fixtures: fixtures,
    ensureDefaultSettings: settings
};
