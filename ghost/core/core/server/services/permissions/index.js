// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

const models = require('../../models');
const actionsMap = require('./actions-map-cache');
const {registerMetrics} = require('./metrics');
const {consistencyCheck} = require('./consistency-check');

const init = async function init(options) {
    options = options || {};
    const permissionsCollection = await models.Permission.findAll(options);
    const actions = actionsMap.init(permissionsCollection);
    registerMetrics();

    // The consistency check queries the `roles` table. Skip if the DB isn't
    // seeded (existing unit tests stub Permission.findAll but not
    // Role.findAll). In CI/test the check throws on real drift.
    try {
        await consistencyCheck();
    } catch (err) {
        if (err && /no such table/i.test(err.message || '')) {
            return actions;
        }
        throw err;
    }
    return actions;
};

module.exports = {
    init: init,
    canThis: require('./can-this'),
    canThisV2: require('./can-this-v2'),
    // @TODO: Make it so that we don't need to export these
    parseContext: require('./parse-context')
};
