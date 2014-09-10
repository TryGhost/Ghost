// # Fixtures
// This module handles populating or updating fixtures.
//
// Currently fixtures only change between data version 002 and 003, therefore the update logic is hard coded
// rather than abstracted into a migration system. The upgrade function checks that its changes are safe before
// making them.

var Promise     = require('bluebird'),
    sequence    = require('../../utils/sequence'),
    _           = require('lodash'),
    errors      = require('../../errors'),
    utils       = require('../../utils'),
    models      = require('../../models'),
    fixtures    = require('./fixtures'),
    permissions = require('./permissions'),

    // Private
    logInfo,
    to003,
    convertAdminToOwner,
    createOwner,
    options = {context: {internal: true}},

    // Public
    populate,
    update;

logInfo = function logInfo(message) {
    errors.logInfo('Migrations', message);
};

/**
 * Convert admin to Owner
 * Changes an admin user to have the owner role
 * @returns {Promise|*}
 */
convertAdminToOwner = function () {
    var adminUser;

    return models.User.findOne({role: 'Administrator'}).then(function (user) {
        adminUser = user;
        return models.Role.findOne({name: 'Owner'});
    }).then(function (ownerRole) {
        if (adminUser) {
            logInfo('Converting admin to owner');
            return adminUser.roles().updatePivot({role_id: ownerRole.id});
        }
    });
};

/**
 * Create Owner
 * Creates the user fixture and gives it the owner role
 * @returns {Promise|*}
 */
createOwner = function () {
    var user = fixtures.users[0];

    return models.Role.findOne({name: 'Owner'}).then(function (ownerRole) {
        user.roles = [ownerRole.id];
        user.password = utils.uid(50);

        logInfo('Creating owner');
        return models.User.add(user, options);
    });
};

populate = function () {
    var ops = [],
        relations = [],
        Post = models.Post,
        Tag = models.Tag,
        Role = models.Role,
        Client = models.Client;

    logInfo('Populating fixtures');

    _.each(fixtures.posts, function (post) {
        ops.push(Post.add(post, options));
    });

    _.each(fixtures.tags, function (tag) {
        ops.push(Tag.add(tag, options));
    });

    _.each(fixtures.roles, function (role) {
        ops.push(Role.add(role, options));
    });

    _.each(fixtures.clients, function (client) {
        ops.push(Client.add(client, options));
    });

    // add the tag to the post
    relations.push(function () {
        return Post.forge({slug: fixtures.posts[0].slug}).fetch().then(function (post) {
            return Tag.forge({slug: fixtures.tags[0].slug}).fetch().then(function (tag) {
                return post.related('tags').attach(tag.id);
            });
        });
    });

    return Promise.all(ops).then(function () {
        return sequence(relations);
    }).then(function () {
        return permissions.populate(options);
    }).then(function () {
        return createOwner();
    }).catch(function (errs) {
        errors.logError(errs);
    });
};

/**
 * ### Update fixtures to 003
 * Need to add client & owner role, then update permissions to 003 as well
 * By doing this in a way that checks before adding, we can ensure that it's possible to force a migration safely.
 *
 * Note: At the moment this is pretty adhoc & untestable, in future it would be better to have a config based system.
 * @returns {Promise|*}
 */
to003 = function () {
    var ops = [],
        upgradeOp,
        Role = models.Role,
        Client = models.Client;

    logInfo('Upgrading fixtures');

    // Add the client fixture if missing
    upgradeOp = Client.findOne({secret: fixtures.clients[0].secret}).then(function (client) {
        if (!client) {
            logInfo('Adding client fixture');
            _.each(fixtures.clients, function (client) {
                return Client.add(client, options);
            });
        }
    });
    ops.push(upgradeOp);

    // Add the owner role if missing
    upgradeOp = Role.findOne({name: fixtures.roles[3].name}).then(function (owner) {
        if (!owner) {
            logInfo('Adding owner role fixture');
            _.each(fixtures.roles.slice(3), function (role) {
                return Role.add(role, options);
            });
        }
    });
    ops.push(upgradeOp);

    return Promise.all(ops).then(function () {
        return permissions.to003(options);
    }).then(function () {
        return convertAdminToOwner();
    });
};

update = function (fromVersion, toVersion) {
    logInfo('Updating fixtures');
    // Are we migrating to, or past 003?
    if ((fromVersion < '003' && toVersion >= '003') ||
        fromVersion === '003' && toVersion === '003' && process.env.FORCE_MIGRATION) {
        return to003();
    }
};

module.exports = {
    populate: populate,
    update: update
};
