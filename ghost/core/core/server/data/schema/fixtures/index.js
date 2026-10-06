const FixtureManager = require('./fixture-manager');
const config = require('../../../../shared/config');
const { withPermissionFixtures } = require('./permission-fixtures');

const fixturePath = config.get('paths').fixtures;
const fixtures = withPermissionFixtures(require(fixturePath));

module.exports.FixtureManager = FixtureManager;
module.exports.fixtureManager = new FixtureManager(fixtures, {
  __OWNER_USER_ID__: (models) => models.User.generateId(),
});
