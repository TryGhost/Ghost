import SlugGenerator from 'ghost/models/slug-generator';
import isNumber from 'ghost/utils/isNumber';
import boundOneWay from 'ghost/utils/bound-one-way';

var SettingsUserController = Ember.Controller.extend({

    user: Ember.computed.alias('model'),

    email: Ember.computed.readOnly('model.email'),

    slugValue: boundOneWay('model.slug'),

    lastPromise: null,

    coverDefault: Ember.computed('ghostPaths', function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-cover.png');
    }),

    userDefault: Ember.computed('ghostPaths', function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    cover: Ember.computed('user.cover', 'coverDefault', function () {
        var cover = this.get('user.cover');

        if (Ember.isBlank(cover)) {
            cover = this.get('coverDefault');
        }

        return 'background-image: url(' + cover + ')';
    }),

    coverTitle: Ember.computed('user.name', function () {
        return this.get('user.name') + '\'s Cover Image';
    }),

    image: Ember.computed('imageUrl', function () {
        return 'background-image: url(' + this.get('imageUrl') + ')';
    }),

    imageUrl: Ember.computed('user.image', function () {
        return this.get('user.image') || this.get('userDefault');
    }),

    last_login: Ember.computed('user.last_login', function () {
        var lastLogin = this.get('user.last_login');

        return lastLogin ? lastLogin.fromNow() : '(Never)';
    }),

    created_at: Ember.computed('user.created_at', function () {
        var createdAt = this.get('user.created_at');

        return createdAt ? createdAt.fromNow() : '';
    }),

    // Lazy load the slug generator for slugPlaceholder
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

            // reload the model to get the most up-to-date user information
            model.reload().then(function () {
                if (model.get('invited')) {
                    model.destroyRecord().then(function () {
                        var notificationText = 'Invitation revoked. (' + email + ')';
                        self.notifications.showSuccess(notificationText, false);
                    }).catch(function (error) {
                        self.notifications.showAPIError(error);
                    });
                } else {
                    // if the user is no longer marked as "invited", then show a warning and reload the route
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
                slugValue = this.get('slugValue'),
                afterUpdateSlug = this.get('lastPromise'),
                promise,
                slugChanged,
                self = this;

            if (user.get('slug') !== slugValue) {
                slugChanged = true;
                user.set('slug', slugValue);
            }

            promise = Ember.RSVP.resolve(afterUpdateSlug).then(function () {
                return user.save({format: false});
            }).then(function (model) {
                var currentPath,
                    newPath;

                self.notifications.showSuccess('Settings successfully saved.');

                // If the user's slug has changed, change the URL and replace
                // the history so refresh and back button still work
                if (slugChanged) {
                    currentPath = window.history.state.path;

                    newPath = currentPath.split('/');
                    newPath[newPath.length - 2] = model.get('slug');
                    newPath = newPath.join('/');

                    window.history.replaceState({path: newPath}, '', newPath);
                }

                return model;
            }).catch(function (errors) {
                self.notifications.showErrors(errors);
            });

            this.set('lastPromise', promise);
        },

        password: function () {
            var user = this.get('user'),
                self = this;

            if (user.get('isPasswordValid')) {
                user.saveNewPassword().then(function (model) {
                    // Clear properties from view
                    user.setProperties({
                        password: '',
                        newPassword: '',
                        ne2Password: ''
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
            var self = this,
                afterSave = this.get('lastPromise'),
                promise;

            promise = Ember.RSVP.resolve(afterSave).then(function () {
                var slug = self.get('model.slug');

                newSlug = newSlug || slug;

                newSlug = newSlug.trim();

                // Ignore unchanged slugs or candidate slugs that are empty
                if (!newSlug || slug === newSlug) {
                    self.set('slugValue', slug);

                    return;
                }

                return self.get('slugGenerator').generateSlug(newSlug).then(function (serverSlug) {
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
                    if (isNumber(check) && check > 0) {
                        if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                            self.set('slugValue', slug);

                            return;
                        }
                    }

                    self.set('slugValue', serverSlug);
                });
            });

            this.set('lastPromise', promise);
        }
    }
});

export default SettingsUserController;
