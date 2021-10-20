const {fixtureManager} = require('../../schema/fixtures');

module.exports.config = {
    transaction: true
};

module.exports.up = async function insertFixtures(options) {
    return await fixtureManager.addAllFixtures(options);
};
