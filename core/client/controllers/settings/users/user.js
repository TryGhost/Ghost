import SlugGenerator from 'ghost/models/slug-generator';

var SettingsUserController = Ember.ObjectController.extend({

    _lastSlug: null,

    updateLastSlug: Ember.observer(function () {
        this.set('_lastSlug', this.get('user.slug'));
    }),

    user: Ember.computed.alias('model'),

    email: Ember.computed.readOnly('user.email'),

    coverDefault: function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-cover.png');
    }.property('ghostPaths'),

    userDefault: function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }.property('ghostPaths'),

    cover: function () {
        var cover = this.get('user.cover');
        if (Ember.isBlank(cover)) {
            cover = this.get('coverDefault');
        }
        return cover;
    }.property('user.cover', 'coverDefault'),

    coverTitle: function () {
        return this.get('user.name') + '\'s Cover Image';
    }.property('user.name'),

    image: function () {
        return  'background-image: url(' + this.get('imageUrl') + ')';
    }.property('imageUrl'),

    imageUrl: function () {
        return this.get('user.image') || this.get('userDefault');
    }.property('user.image'),

    last_login: function () {
        var lastLogin = this.get('user.last_login');

        return lastLogin ? lastLogin.fromNow() : '';
    }.property('user.last_login'),

    created_at: function () {
        var createdAt = this.get('user.created_at');

        return createdAt ? createdAt.fromNow() : '';
    }.property('user.created_at'),

    //Lazy load the slug generator for slugPlaceholder
    slugGenerator: Ember.computed(function () {
        return SlugGenerator.create({
            ghostPaths: this.get('ghostPaths'),
            slugType: 'user'
        });
    }),

    actions: {
        changeRole: function (newRole) {
            this.set('model.role', newRole);
        },
        revoke: function () {
            var self = this,
                model = this.get('model'),
                email = this.get('email');

            //reload the model to get the most up-to-date user information
            model.reload().then(function () {
                if (self.get('invited')) {
                    model.destroyRecord().then(function () {
                        var notificationText = 'Invitation revoked. (' + email + ')';
                        self.notifications.showSuccess(notificationText, false);
                    }).catch(function (error) {
                        self.notifications.showAPIError(error);
                    });
                } else {
                    //if the user is no longer marked as "invited", then show a warning and reload the route
                    self.get('target').send('reload');
                    self.notifications.showError('This user has already accepted the invitation.', {delayed: 500});
                }
            });
        },

        resend: function () {
            var self = this;

            this.get('model').resendInvite().then(function (result) {
                var notificationText = 'Invitation resent! (' + self.get('email') + ')';
                // If sending the invitation email fails, the API will still return a status of 201
                // but the user's status in the response object will be 'invited-pending'.
                if (result.users[0].status === 'invited-pending') {
                    self.notifications.showWarn('Invitation email was not sent.  Please try resending.');
                } else {
                    self.get('model').set('status', result.users[0].status);
                    self.notifications.showSuccess(notificationText);
                }
            }).catch(function (error) {
                self.notifications.showAPIError(error);
            });
        },

        save: function () {
            var user = this.get('user'),
                self = this;

            user.save({ format: false }).then(function (model) {
                self.notifications.showSuccess('Settings successfully saved.');

                return model;
            }).catch(function (errors) {
                self.notifications.showErrors(errors);
            });
        },

        password: function () {
            var user = this.get('user'),
                self = this;

            if (user.get('isPasswordValid')) {
                user.saveNewPassword().then(function (model) {

                    // Clear properties from view
                    user.setProperties({
                        'password': '',
                        'newPassword': '',
                        'ne2Password': ''
                    });

                    self.notifications.showSuccess('Password updated.');

                    return model;
                }).catch(function (errors) {
                    self.notifications.showAPIError(errors);
                });
            } else {
                self.notifications.showErrors(user.get('passwordValidationErrors'));
            }
        },

        updateSlug: function (newSlug) {
            var slug = this.get('_lastSlug'),
                self = this;

            newSlug = newSlug || slug;

            newSlug = newSlug.trim();

            // Ignore unchanged slugs or candidate slugs that are empty
            if (!newSlug || slug === newSlug) {
                return;
            }

            this.get('slugGenerator').generateSlug(newSlug).then(function (serverSlug) {

                // If after getting the sanitized and unique slug back from the API
                // we end up with a slug that matches the existing slug, abort the change
                if (serverSlug === slug) {
                    return;
                }

                // Because the server transforms the candidate slug by stripping
                // certain characters and appending a number onto the end of slugs
                // to enforce uniqueness, there are cases where we can get back a
                // candidate slug that is a duplicate of the original except for
                // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

                // get the last token out of the slug candidate and see if it's a number
                var slugTokens = serverSlug.split('-'),
                    check = Number(slugTokens.pop());

                // if the candidate slug is the same as the existing slug except
                // for the incrementor then the existing slug should be used
                if (_.isNumber(check) && check > 0) {
                    if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                        return;
                    }
                }

                self.set('_lastSlug', serverSlug);
            });
        }
    }
});

export default SettingsUserController;
