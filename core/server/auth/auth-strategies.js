var models = require('../models'),
    utils = require('../utils'),
    strategies;

strategies = {

    /**
     * ClientPasswordStrategy
     *
     * This strategy is used to authenticate registered OAuth clients.  It is
     * employed to protect the `token` endpoint, which consumers use to obtain
     * access tokens.  The OAuth 2.0 specification suggests that clients use the
     * HTTP Basic scheme to authenticate (not implemented yet).
     * Use of the client password strategy is implemented to support ember-simple-auth.
     */
    clientPasswordStrategy: function clientPasswordStrategy(clientId, clientSecret, done) {
        return models.Client.findOne({slug: clientId}, {withRelated: ['trustedDomains']})
            .then(function then(model) {
                if (model) {
                    var client = model.toJSON({include: ['trustedDomains']});
                    if (client.status === 'enabled' && client.secret === clientSecret) {
                        return done(null, client);
                    }
                }
                return done(null, false);
            });
    },

    /**
     * BearerStrategy
     *
     * This strategy is used to authenticate users based on an access token (aka a
     * bearer token).  The user must have previously authorized a client
     * application, which is issued an access token to make requests on behalf of
     * the authorizing user.
     */
    bearerStrategy: function bearerStrategy(accessToken, done) {
        return models.Accesstoken.findOne({token: accessToken})
            .then(function then(model) {
                if (model) {
                    var token = model.toJSON();
                    if (token.expires > Date.now()) {
                        return models.User.findOne({id: token.user_id})
                            .then(function then(model) {
                                if (model) {
                                    var user = model.toJSON(),
                                        info = {scope: '*'};
                                    return done(null, {id: user.id}, info);
                                }
                                return done(null, false);
                            });
                    } else {
                        return done(null, false);
                    }
                } else {
                    return done(null, false);
                }
            });
    },

    /**
     * Ghost Strategy
     * patronusRefreshToken: will be null for now, because we don't need it right now
     *
     * CASES:
     * - via invite token
     * - via normal auth
     *
     * @TODO: case protect self invite (check first if invite token exists)
     * @TODO: password_digest is send from patronus - tell
     * @TODO: forward type (invite, signup)
     * @TODO: validate profile?
     */
    ghostStrategy: function ghostStrategy(req, patronusAccessToken, patronusRefreshToken, profile, done) {
        var inviteToken = req.body.inviteToken,
            options = {context: {internal: true}};

        var handleInviteToken = function handleInviteToken() {
            var user, invite;

            //@TODO: reconsider how we are doing that
            inviteToken = utils.decodeBase64URLsafe(inviteToken);

            return models.Invite.findOne({token: inviteToken}, options)
                .then(function (_invite) {
                    invite = _invite;

                    if (!invite) {
                        return null;
                    }

                    if (invite.get('expires') < Date.now()) {
                        return null;
                    }

                    return models.User.add({
                        email: profile.email_address,
                        name: profile.email_address,
                        password: utils.uid(50),
                        roles: invite.toJSON().roles
                    }, options);
                })
                .then(function (_user) {
                    user = _user;

                    if (!invite || !user) {
                        return null;
                    }

                    return invite.destroy(options);
                })
                .then(function () {
                    return user;
                });
        };

        var handleSetup = function handleSetup() {
            //@TODO: fixme status with context
            return models.User.findOne({slug: 'ghost-owner', status: 'inactive'}, options)
                .then(function (owner) {
                    options.id = owner.id;

                    return models.User.edit({
                        email: profile.email_address,
                        status: 'active'
                    }, options);
                })
                .catch(function (err) {
                    return null;
                })
        };

        return models.User.getByEmail(profile.email_address, options)
            .then(function (user) {
                if (user) {
                    return Promise.resolve(user);
                }

                if (inviteToken) {
                    return handleInviteToken();
                }

                return handleSetup();
            })
            .then(function (user) {
                if (!user) {
                    return done(null, false);
                }

                options.id = user.id;

                //@TODO: only store for owner?
                return models.User.edit({patronus_access_token: patronusAccessToken}, options);
            })
            .then(function (user) {
                if (!user) {
                    return done(null, false);
                }

                done(null, user, profile);
            })
            .catch(function (err) {
                done(err);
            });
    }
};

module.exports = strategies;
