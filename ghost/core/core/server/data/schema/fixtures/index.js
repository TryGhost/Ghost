const FixtureManager = require('./fixture-manager');
const config = require('../../../../shared/config');

const fixturePath = config.get('paths').fixtures;
const fixtures = require(fixturePath);

module.exports.FixtureManager = FixtureManager;
module.exports.fixtureManager = new FixtureManager(fixtures);
