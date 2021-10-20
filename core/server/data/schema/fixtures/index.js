const FixtureManager = require('./fixture-manager');
const fixtures = require('./fixtures');

module.exports.FixtureManager = FixtureManager;
module.exports.fixtureManager = new FixtureManager(fixtures);
