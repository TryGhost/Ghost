import SlugGenerator from 'ghost/models/slug-generator';
import boundOneWay from 'ghost/utils/bound-one-way';

var SettingsUserController = Ember.ObjectController.extend({

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

    slugValue: boundOneWay('user.slug'),

    actions: {
        changeRole: function (newRole) {
            this.set('model.role', newRole);
        },
        revoke: function () {
            var self = this,
                email = this.get('email');

            this.get('model').destroyRecord().then(function () {
                var notificationText = 'Invitation revoked. (' + email + ')';
                self.notifications.showSuccess(notificationText, false);
            }).catch(function (error) {
                self.notifications.closePassive();
                self.notifications.showAPIError(error);
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
                    self.notifications.showSuccess(notificationText, false);
                }
            }).catch(function (error) {
                self.notifications.closePassive();
                self.notifications.showAPIError(error);
            });
        },

        save: function () {
            var user = this.get('user'),
                self = this;

            user.save({ format: false }).then(function (model) {
                self.notifications.closePassive();
                self.notifications.showSuccess('Settings successfully saved.');

                return model;
            }).catch(function (errors) {
                self.notifications.closePassive();
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

                    self.notifications.closePassive();
                    self.notifications.showSuccess('Password updated.');

                    return model;
                }).catch(function (errors) {
                    self.notifications.closePassive();
                    self.notifications.showAPIError(errors);
                });
            } else {
                self.notifications.showErrors(user.get('passwordValidationErrors'));
            }
        },

        updateSlug: function (newSlug) {
            var slug = this.get('user.slug'),
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

                self.set('user.slug', serverSlug);
            });
        }
    }
});

export default SettingsUserController;
