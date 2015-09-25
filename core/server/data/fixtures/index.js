// # Fixtures
// This module handles populating or updating fixtures.
//
// Currently fixtures only change between data version 002 and 003, therefore the update logic is hard coded
// rather than abstracted into a migration system. The upgrade function checks that its changes are safe before
// making them.

var Promise     = require('bluebird'),
    crypto      = require('crypto'),
    sequence    = require('../../utils/sequence'),
    _           = require('lodash'),
    errors      = require('../../errors'),
    config      = require('../../config'),
    utils       = require('../../utils'),
    models      = require('../../models'),
    fixtures    = require('./fixtures'),
    permissions = require('./permissions'),
    notifications = require('../../api/notifications'),

    // Private
    logInfo,
    to003,
    to004,
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
convertAdminToOwner = function convertAdminToOwner() {
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
createOwner = function createOwner() {
    var user = fixtures.users[0];

    return models.Role.findOne({name: 'Owner'}).then(function (ownerRole) {
        user.roles = [ownerRole.id];
        user.password = utils.uid(50);

        logInfo('Creating owner');
        return models.User.add(user, options);
    });
};

populate = function populate() {
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
        // no random secrets during testing
        if (process.env.NODE_ENV.indexOf('testing') !== 0) {
            client.secret = crypto.randomBytes(6).toString('hex');
        }
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
to003 = function to003() {
    var ops = [],
        upgradeOp,
        Role = models.Role,
        Client = models.Client;

    logInfo('Upgrading fixtures to 003');

    // Add the client fixture if missing
    upgradeOp = Client.findOne({slug: fixtures.clients[0].slug}).then(function (client) {
        if (!client) {
            logInfo('Adding ghost-admin client fixture');
            return Client.add(fixtures.clients[0], options);
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

/**
 * Update ghost_foot to include a CDN of jquery if the DB is migrating from
 * @return {Promise}
 */
to004 = function to004() {
    var value,
        ops = [],
        upgradeOp,
        jquery = [
            '<!-- You can safely delete this line if your theme does not require jQuery -->\n',
            '<script type="text/javascript" src="https://code.jquery.com/jquery-1.11.3.min.js"></script>\n\n'
        ],
        privacyMessage = [
            'jQuery has been removed from Ghost core and is now being loaded from the jQuery Foundation\'s CDN.',
            'This can be changed or removed in your <strong>Code Injection</strong> settings area.'
        ];

    logInfo('Upgrading fixtures to 004');

    // add jquery setting and privacy info
    upgradeOp = function () {
        return models.Settings.findOne('ghost_foot').then(function (setting) {
            if (setting) {
                value = setting.attributes.value;
                // Only add jQuery if it's not already in there
                if (value.indexOf(jquery.join('')) === -1) {
                    logInfo('Adding jQuery link to ghost_foot');
                    value = jquery.join('') + value;
                    return models.Settings.edit({key: 'ghost_foot', value: value}, options).then(function () {
                        if (_.isEmpty(config.privacy)) {
                            return Promise.resolve();
                        }
                        logInfo(privacyMessage.join(' ').replace(/<\/?strong>/g, ''));
                        return notifications.add({notifications: [{
                            type: 'info',
                            message: privacyMessage.join(' ')
                        }]}, options);
                    });
                }
            }
        });
    };
    ops.push(upgradeOp);

    // change `type` for protected blog `isPrivate` setting
    upgradeOp = function () {
        return models.Settings.findOne('isPrivate').then(function (setting) {
            if (setting) {
                logInfo('Update isPrivate setting');
                return models.Settings.edit({key: 'isPrivate', type: 'private'}, options);
            }
            return Promise.resolve();
        });
    };
    ops.push(upgradeOp);

    // change `type` for protected blog `password` setting
    upgradeOp = function () {
        return models.Settings.findOne('password').then(function (setting) {
            if (setting) {
                logInfo('Update password setting');
                return models.Settings.edit({key: 'password', type: 'private'}, options);
            }
            return Promise.resolve();
        });
    };
    ops.push(upgradeOp);

    // Update ghost-admin client fixture
    // ghost-admin should exist from 003 version
    upgradeOp = function () {
        return models.Client.findOne({slug: fixtures.clients[0].slug}).then(function (client) {
            if (client) {
                logInfo('Update ghost-admin client fixture');
                var adminClient = fixtures.clients[0];
                adminClient.secret = crypto.randomBytes(6).toString('hex');
                return models.Client.edit(adminClient, _.extend({}, options, {id: client.id}));
            }
            return Promise.resolve();
        });
    };
    ops.push(upgradeOp);

    // add ghost-frontend client if missing
    upgradeOp = function () {
        return models.Client.findOne({slug: fixtures.clients[1].slug}).then(function (client) {
            if (!client) {
                logInfo('Add ghost-frontend client fixture');
                var frontendClient = fixtures.clients[1];
                frontendClient.secret = crypto.randomBytes(6).toString('hex');
                return models.Client.add(frontendClient, options);
            }
            return Promise.resolve();
        });
    };
    ops.push(upgradeOp);

    // clean up broken tags
    upgradeOp = function () {
        return models.Tag.findAll(options).then(function (tags) {
            var tagOps = [];
            if (tags) {
                tags.each(function (tag) {
                    var name = tag.get('name'),
                        updated = name.replace(/^(,+)/, '').trim();

                    // If we've ended up with an empty string, default to just 'tag'
                    updated = updated === '' ? 'tag' : updated;

                    if (name !== updated) {
                        tagOps.push(tag.save({name: updated}, options));
                    }
                });
                if (tagOps.length > 0) {
                    logInfo('Cleaning ' + tagOps.length + ' malformed tags');
                    return Promise.all(tagOps);
                }
            }
            return Promise.resolve();
        });
    };
    ops.push(upgradeOp);

    // Add post_tag order
    upgradeOp = function () {
        var tagOps = [];
        logInfo('Collecting data on tag order for posts...');
        return models.Post.findAll(_.extend({}, options)).then(function (posts) {
            if (posts) {
                return posts.mapThen(function (post) {
                    return post.load(['tags']);
                });
            }
            return [];
        }).then(function (posts) {
            _.each(posts, function (post) {
                var order = 0;
                post.related('tags').each(function (tag) {
                    tagOps.push((function (order) {
                        var sortOrder = order;
                        return function () {
                            return post.tags().updatePivot(
                                {sort_order: sortOrder}, _.extend({}, options, {query: {where: {tag_id: tag.id}}})
                            );
                        };
                    }(order)));
                    order += 1;
                });
            });

            if (tagOps.length > 0) {
                logInfo('Updating order on ' + tagOps.length + ' tag relationships (could take a while)...');
                return sequence(tagOps).then(function () {
                    logInfo('Tag order successfully updated');
                });
            }
        });
    };
    ops.push(upgradeOp);

    // Add a new draft post
    upgradeOp = function () {
        return models.Post.findOne({slug: fixtures.posts_0_7[0].slug, status: 'all'}, options).then(function (post) {
            if (!post) {
                logInfo('Adding 0.7 upgrade post fixture');
                // Set the published_at timestamp, but keep the post as a draft so doesn't appear on the frontend
                // This is a hack to ensure that this post appears at the very top of the drafts list, because
                // unpublished posts always appear first
                fixtures.posts_0_7[0].published_at = Date.now();
                return models.Post.add(fixtures.posts_0_7[0], options);
            }
        });
    };
    ops.push(upgradeOp);

    return sequence(ops);
};

update = function update(fromVersion, toVersion) {
    var ops = [];

    logInfo('Updating fixtures');
    // Are we migrating to, or past 003?
    if ((fromVersion < '003' && toVersion >= '003') ||
        fromVersion === '003' && toVersion === '003' && process.env.FORCE_MIGRATION) {
        ops.push(to003);
    }

    if (fromVersion < '004' && toVersion === '004' ||
        fromVersion === '004' && toVersion === '004' && process.env.FORCE_MIGRATION) {
        ops.push(to004);
    }

    return sequence(ops);
};

module.exports = {
    populate: populate,
    update: update
};
