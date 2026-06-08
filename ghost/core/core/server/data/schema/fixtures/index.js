const FixtureManager = require('./fixture-manager');
const config = require('../../../../shared/config');

const fixturePath = config.get('paths').fixtures;
const fixtures = require(fixturePath);

module.exports.FixtureManager = FixtureManager;
module.exports.fixtureManager = new FixtureManager(fixtures, {
    __OWNER_USER_ID__: models => models.User.generateId()
});
