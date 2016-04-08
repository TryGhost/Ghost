// Update the permissions & permissions_roles tables to get the new entries
var utils    = require('../utils');

function getClientPermissions() {
    return utils.findModelFixtures('Permission', {object_type: 'client'});
}

function getClientRelations() {
    return utils.findPermissionRelationsForObject('client');
}

function printResult(logger, result, message) {
    if (result.done === result.expected) {
        logger.info(message);
    } else {
        logger.warn('(' + result.done + '/' + result.expected + ') ' + message);
    }
}

module.exports = function addClientPermissions(options, logger) {
    var modelToAdd = getClientPermissions(),
        relationToAdd = getClientRelations();

    return utils.addFixturesForModel(modelToAdd).then(function (result) {
        printResult(logger, result, 'Adding permissions fixtures for clients');
        return utils.addFixturesForRelation(relationToAdd);
    }).then(function (result) {
        printResult(logger, result, 'Adding permissions_roles fixtures for clients');
    });
};
